import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, AnswerResult, DetectionResult, DocumentAnalysisResult } from './types.js';

// Real LLM-backed provider. Only instantiated when ANTHROPIC_API_KEY is
// set (see index.ts's provider factory) — this file is exercised by unit
// tests only for its pure parsing helpers, since this sandbox has no API
// key configured (spec section 44: don't fake an active integration).
const SYSTEM_PROMPT = `Tu es un assistant qui explique des documents administratifs à des utilisateurs non spécialistes.
Règles strictes :
- N'utilise QUE le texte fourni. N'invente jamais un montant, une date, une loi, un organisme ou une obligation qui n'apparaît pas dans le texte.
- Si une information demandée n'est pas dans le texte, dis clairement que tu ne peux pas la confirmer plutôt que de deviner.
- Réponds uniquement avec un objet JSON valide correspondant exactement au schéma demandé, sans texte avant ou après.`;

function extractJson(raw: string): unknown {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('AI response did not contain JSON');
  return JSON.parse(raw.slice(start, end + 1));
}

export class AnthropicAIProvider implements AIProvider {
  readonly name = 'anthropic';
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  private async completeJson(userPrompt: string, maxTokens = 1024): Promise<unknown> {
    const msg = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const text = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    return extractJson(text);
  }

  async analyzeDocument(input: { text: string; filename: string; mimeType: string }): Promise<DocumentAnalysisResult> {
    const schema = `{"documentType": string, "summary": string, "simpleSummary": string, "amountCents": number|null, "currency": string|null, "dueDateIso": string|null, "actionRequired": string, "confidence": number between 0 and 1}`;
    const prompt = `Analyse ce document (fichier : ${input.filename}) et réponds avec ce schéma JSON : ${schema}\n\nTexte du document :\n"""\n${input.text.slice(0, 20000)}\n"""`;
    const result = (await this.completeJson(prompt)) as Record<string, unknown>;
    return {
      documentType: String(result.documentType ?? 'Document'),
      summary: String(result.summary ?? ''),
      simpleSummary: String(result.simpleSummary ?? ''),
      amountCents: typeof result.amountCents === 'number' ? result.amountCents : null,
      currency: typeof result.currency === 'string' ? result.currency : null,
      dueDate: typeof result.dueDateIso === 'string' ? result.dueDateIso : null,
      actionRequired: String(result.actionRequired ?? ''),
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
      sources: [{ label: `${input.filename} — analysé par IA`, kind: 'document' }],
      provider: this.name,
    };
  }

  async detectCountry(text: string): Promise<DetectionResult> {
    const prompt = `À partir des indices dans ce texte (langue, adresses, organismes, devise, format de date, terminologie), déduis le pays d'origine le plus probable. Réponds avec {"country": "code ISO 3166-1 alpha-2 ou UNKNOWN", "confidence": number entre 0 et 1}.\n\nTexte :\n"""${text.slice(0, 5000)}"""`;
    const result = (await this.completeJson(prompt, 128)) as { country?: string; confidence?: number };
    return { value: result.country ?? 'UNKNOWN', confidence: result.confidence ?? 0 };
  }

  async detectLanguage(text: string): Promise<DetectionResult> {
    const prompt = `Détecte la langue principale de ce texte. Réponds avec {"language": "code BCP-47 (ex: fr, en, es)", "confidence": number entre 0 et 1}.\n\nTexte :\n"""${text.slice(0, 3000)}"""`;
    const result = (await this.completeJson(prompt, 64)) as { language?: string; confidence?: number };
    return { value: result.language ?? 'unknown', confidence: result.confidence ?? 0 };
  }

  async translate(text: string, targetLocale: string): Promise<string> {
    const msg = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: 'Tu traduis fidèlement le texte fourni, sans ajouter ni omettre d\'information, sans commentaire.',
      messages: [{ role: 'user', content: `Traduis ce texte vers la langue "${targetLocale}" :\n\n${text.slice(0, 8000)}` }],
    });
    return msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  }

  async answerQuestion(input: { question: string; contextText: string; documentLabel: string }): Promise<AnswerResult> {
    const schema = `{"answer": string, "confidence": number between 0 and 1, "insufficientInformation": boolean}`;
    const prompt = `Un utilisateur pose une question sur un document. Réponds UNIQUEMENT à partir du texte fourni. Si l'information n'y est pas, mets insufficientInformation à true et dis-le dans "answer" au lieu d'inventer une réponse. Réponds avec ce schéma : ${schema}\n\nDocument (${input.documentLabel}) :\n"""${input.contextText.slice(0, 15000)}"""\n\nQuestion : ${input.question}`;
    const result = (await this.completeJson(prompt, 512)) as { answer?: string; confidence?: number; insufficientInformation?: boolean };
    return {
      answer: String(result.answer ?? ''),
      sources: [{ label: `${input.documentLabel} — texte extrait`, kind: 'document' }],
      confidence: result.confidence ?? 0.5,
      insufficientInformation: Boolean(result.insufficientInformation),
    };
  }

  async compareDocuments(input: { textA: string; textB: string; labelA: string; labelB: string }): Promise<string> {
    const msg = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Compare ces deux documents et résume les différences importantes (montants, dates, clauses). N'invente rien qui ne soit pas dans les textes.\n\n${input.labelA} :\n"""${input.textA.slice(0, 8000)}"""\n\n${input.labelB} :\n"""${input.textB.slice(0, 8000)}"""`,
        },
      ],
    });
    return msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  }
}
