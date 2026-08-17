import type { AIProvider, AnswerResult, DetectionResult, DocumentAnalysisResult, Source } from './types.js';

// Deterministic, rule-based provider used when no real AI provider is
// configured (spec section 44: never claim an integration is active when
// it isn't). It only ever reports what it can literally find in the
// extracted text via regex — it does not generate prose about facts it
// hasn't seen, so it cannot hallucinate amounts, dates, or obligations.
// This is what ships by default; see AnthropicAIProvider for the real
// LLM-backed alternative, gated behind ANTHROPIC_API_KEY.

const AMOUNT_RE = /(\d{1,3}(?:[ .]\d{3})*,\d{2})\s?€|€\s?(\d{1,3}(?:[ .]\d{3})*,\d{2})|(\d{1,3}(?:[ .]\d{3})*\.\d{2})\s?(?:EUR|USD|\$)/i;

const FR_MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const EN_MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

const FR_DATE_RE = new RegExp(`(\\d{1,2})\\s+(${FR_MONTHS.join('|')})\\s+(\\d{4})`, 'i');
const EN_DATE_RE = new RegExp(`(${EN_MONTHS.join('|')})\\s+(\\d{1,2}),?\\s+(\\d{4})`, 'i');
const NUMERIC_DATE_RE = /(\d{4})-(\d{2})-(\d{2})|(\d{1,2})\/(\d{1,2})\/(\d{4})/;

function findAmountCents(text: string): number | null {
  const m = AMOUNT_RE.exec(text);
  if (!m) return null;
  const raw = (m[1] ?? m[2] ?? m[3] ?? '').replace(/[ .](?=\d{3})/g, '').replace(',', '.');
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? Math.round(value * 100) : null;
}

function findDateIso(text: string): string | null {
  const fr = FR_DATE_RE.exec(text);
  if (fr) {
    const day = Number(fr[1]);
    const month = FR_MONTHS.indexOf(fr[2].toLowerCase()) + 1;
    const year = Number(fr[3]);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const en = EN_DATE_RE.exec(text);
  if (en) {
    const month = EN_MONTHS.indexOf(en[1].toLowerCase()) + 1;
    const day = Number(en[2]);
    const year = Number(en[3]);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const num = NUMERIC_DATE_RE.exec(text);
  if (num) {
    if (num[1]) return `${num[1]}-${num[2]}-${num[3]}`;
    return `${num[6]}-${String(num[5]).padStart(2, '0')}-${String(num[4]).padStart(2, '0')}`;
  }
  return null;
}

const TYPE_KEYWORDS: Array<[RegExp, string]> = [
  [/facture|invoice|bill\b/i, 'Facture'],
  [/contrat|contract|agreement/i, 'Contrat'],
  [/assurance|insurance|policy/i, "Document d'assurance"],
  [/amende|fine|contravention|ticket/i, 'Amende'],
  [/relevé|banque|bank statement|iban/i, 'Document bancaire'],
  [/impôt|impot|tax|fiscal/i, 'Document fiscal'],
  [/bail|lease|loyer|rent/i, 'Document de logement'],
];

function detectDocumentType(text: string): string {
  for (const [re, label] of TYPE_KEYWORDS) if (re.test(text)) return label;
  return 'Document';
}

export class MockAIProvider implements AIProvider {
  readonly name = 'mock';

  async analyzeDocument(input: { text: string; filename: string; mimeType: string }): Promise<DocumentAnalysisResult> {
    const text = input.text.trim();
    const documentType = detectDocumentType(text || input.filename);
    const amountCents = findAmountCents(text);
    const dueDate = findDateIso(text);

    const sources: Source[] = [];
    if (text) sources.push({ label: `${input.filename} — texte extrait`, kind: 'document' });

    const hasContent = text.length > 0;
    const summary = hasContent
      ? `Document identifié comme : ${documentType}. ${amountCents !== null ? `Montant détecté : ${(amountCents / 100).toFixed(2)} €. ` : ''}${dueDate ? `Date détectée : ${dueDate}.` : ''}`.trim()
      : "Le texte n'a pas pu être extrait de ce fichier (image sans OCR configuré, ou PDF illisible).";
    const simpleSummary = hasContent
      ? `C'est un document de type "${documentType}".${amountCents !== null ? ` Il mentionne un montant de ${(amountCents / 100).toFixed(2)} €.` : ''}${dueDate ? ` Une date importante a été trouvée : ${dueDate}.` : ''} Vérifiez ces informations sur le document original avant d'agir.`
      : "Nous n'avons pas pu lire le contenu de ce document automatiquement. Vous pouvez tout de même le consulter et le classer manuellement.";

    return {
      documentType,
      summary,
      simpleSummary,
      amountCents,
      currency: amountCents !== null ? 'EUR' : null,
      dueDate,
      actionRequired: amountCents !== null && dueDate
        ? `Vérifier et, si nécessaire, payer ${(amountCents / 100).toFixed(2)} € avant le ${dueDate}.`
        : "Consultez le document original : cette analyse automatique n'a pas trouvé assez d'informations pour être certaine.",
      confidence: hasContent ? (amountCents !== null && dueDate ? 0.55 : 0.3) : 0.05,
      sources,
      provider: this.name,
    };
  }

  async detectCountry(text: string): Promise<DetectionResult> {
    if (/\beuro?s?\b|€|siret|tva|république française/i.test(text)) return { value: 'FR', confidence: 0.4 };
    if (/\$|usd|zip code|ssn/i.test(text)) return { value: 'US', confidence: 0.3 };
    return { value: 'UNKNOWN', confidence: 0 };
  }

  async detectLanguage(text: string): Promise<DetectionResult> {
    const frHits = (text.match(/\b(le|la|les|de|vous|votre|facture|paiement)\b/gi) ?? []).length;
    const enHits = (text.match(/\b(the|you|your|invoice|payment)\b/gi) ?? []).length;
    if (frHits === 0 && enHits === 0) return { value: 'unknown', confidence: 0 };
    return frHits >= enHits ? { value: 'fr', confidence: 0.5 } : { value: 'en', confidence: 0.5 };
  }

  async translate(text: string): Promise<string> {
    return `[Traduction non disponible : aucun fournisseur IA n'est configuré sur ce serveur.]\n\n${text}`;
  }

  async answerQuestion(input: { question: string; contextText: string; documentLabel: string }): Promise<AnswerResult> {
    const hasContext = input.contextText.trim().length > 0;
    if (!hasContext) {
      return {
        answer: "Je n'ai pas suffisamment d'informations pour répondre à cette question avec certitude — aucun fournisseur IA n'est configuré et je n'ai pas pu lire le contenu de ce document.",
        sources: [],
        confidence: 0,
        insufficientInformation: true,
      };
    }
    return {
      answer:
        "Un fournisseur IA n'est pas configuré sur ce serveur (démonstration). Voici ce que le texte extrait du document contient, tel quel : " +
        input.contextText.slice(0, 300) +
        (input.contextText.length > 300 ? '…' : ''),
      sources: [{ label: `${input.documentLabel} — texte extrait`, kind: 'document' }],
      confidence: 0.2,
      insufficientInformation: false,
    };
  }

  async compareDocuments(input: { labelA: string; labelB: string }): Promise<string> {
    return `La comparaison approfondie de documents nécessite un fournisseur IA configuré (${input.labelA} vs ${input.labelB} — non comparés).`;
  }
}
