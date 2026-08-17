// A source citation attached to any AI-produced claim — spec sections 16/39:
// every statement is either grounded in the document, grounded in an
// official source, flagged as the AI's own interpretation, or flagged as
// uncertain. Nothing is presented as fact without one of these kinds.
export type SourceKind = 'document' | 'official' | 'ai_interpretation' | 'uncertain';

export interface Source {
  label: string;
  kind: SourceKind;
  url?: string;
  page?: number;
}

export interface DocumentAnalysisResult {
  documentType: string;
  summary: string;
  simpleSummary: string;
  amountCents: number | null;
  currency: string | null;
  dueDate: string | null; // ISO date
  actionRequired: string;
  confidence: number; // 0..1
  sources: Source[];
  provider: string;
}

export interface AnswerResult {
  answer: string;
  sources: Source[];
  confidence: number;
  insufficientInformation: boolean;
}

export interface DetectionResult {
  value: string;
  confidence: number;
}

export interface AIProvider {
  readonly name: string;
  analyzeDocument(input: { text: string; filename: string; mimeType: string }): Promise<DocumentAnalysisResult>;
  detectCountry(text: string): Promise<DetectionResult>;
  detectLanguage(text: string): Promise<DetectionResult>;
  translate(text: string, targetLocale: string): Promise<string>;
  answerQuestion(input: { question: string; contextText: string; documentLabel: string }): Promise<AnswerResult>;
  compareDocuments(input: { textA: string; textB: string; labelA: string; labelB: string }): Promise<string>;
}
