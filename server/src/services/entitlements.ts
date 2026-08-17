import { prisma } from '../lib/prisma.js';
import type { PlanCode } from '@prisma/client';

// Centralized feature policy (spec section 11). Both the frontend (to hide
// UI) and this backend (to actually block the request) read from the same
// list — the frontend check is UX only, this one is the real gate.
export const FEATURES = {
  // Standard
  documentAnalysis: 'document_analysis',
  summarize: 'summarize',
  simpleExplanation: 'simple_explanation',
  entityExtraction: 'entity_extraction',
  dateDetection: 'date_detection',
  classification: 'classification',
  search: 'search',
  tasks: 'tasks',
  reminders: 'reminders',
  calendar: 'calendar',
  translationBasic: 'translation_basic',
  vault: 'vault',
  history: 'history',
  aiAssistantBasic: 'ai_assistant_basic',
  // Premium-only
  chatbotAdvanced: 'chatbot_advanced',
  deepAnalysis: 'deep_analysis',
  largePdfAnalysis: 'large_pdf_analysis',
  multiDocumentAnalysis: 'multi_document_analysis',
  documentComparison: 'document_comparison',
  semanticSearchAdvanced: 'semantic_search_advanced',
  letterGeneration: 'letter_generation',
  emailGeneration: 'email_generation',
  formPreparation: 'form_preparation',
  translationAdvanced: 'translation_advanced',
  personalAssistant: 'personal_assistant',
  complexQuestions: 'complex_questions',
  automations: 'automations',
  smartPrioritization: 'smart_prioritization',
} as const;

export type Feature = (typeof FEATURES)[keyof typeof FEATURES];

const STANDARD_FEATURES: ReadonlySet<Feature> = new Set([
  FEATURES.documentAnalysis,
  FEATURES.summarize,
  FEATURES.simpleExplanation,
  FEATURES.entityExtraction,
  FEATURES.dateDetection,
  FEATURES.classification,
  FEATURES.search,
  FEATURES.tasks,
  FEATURES.reminders,
  FEATURES.calendar,
  FEATURES.translationBasic,
  FEATURES.vault,
  FEATURES.history,
  FEATURES.aiAssistantBasic,
]);

const PREMIUM_FEATURES: ReadonlySet<Feature> = new Set([
  ...STANDARD_FEATURES,
  FEATURES.chatbotAdvanced,
  FEATURES.deepAnalysis,
  FEATURES.largePdfAnalysis,
  FEATURES.multiDocumentAnalysis,
  FEATURES.documentComparison,
  FEATURES.semanticSearchAdvanced,
  FEATURES.letterGeneration,
  FEATURES.emailGeneration,
  FEATURES.formPreparation,
  FEATURES.translationAdvanced,
  FEATURES.personalAssistant,
  FEATURES.complexQuestions,
  FEATURES.automations,
  FEATURES.smartPrioritization,
]);

export function planFeatures(plan: PlanCode | null): ReadonlySet<Feature> {
  if (plan === 'PREMIUM') return PREMIUM_FEATURES;
  if (plan === 'STANDARD') return STANDARD_FEATURES;
  return new Set();
}

export function planHasFeature(plan: PlanCode | null, feature: Feature): boolean {
  return planFeatures(plan).has(feature);
}

// The single source of truth for "what plan is this user actually on right
// now" — always the backend's own database state, never something the
// frontend asserts (spec section 10/23).
export async function getActivePlan(userId: string): Promise<PlanCode | null> {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ['ACTIVE', 'TRIALING'] } },
    orderBy: { createdAt: 'desc' },
  });
  return sub?.planCode ?? null;
}
