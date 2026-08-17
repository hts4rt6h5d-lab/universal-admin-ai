import { describe, it, expect } from 'vitest';
import { planHasFeature, FEATURES } from '../../src/services/entitlements.js';

describe('entitlements', () => {
  it('Standard has document analysis but not the advanced chatbot', () => {
    expect(planHasFeature('STANDARD', FEATURES.documentAnalysis)).toBe(true);
    expect(planHasFeature('STANDARD', FEATURES.chatbotAdvanced)).toBe(false);
  });

  it('Premium has every Standard feature plus the advanced ones', () => {
    expect(planHasFeature('PREMIUM', FEATURES.documentAnalysis)).toBe(true);
    expect(planHasFeature('PREMIUM', FEATURES.chatbotAdvanced)).toBe(true);
    expect(planHasFeature('PREMIUM', FEATURES.documentComparison)).toBe(true);
  });

  it('No plan (null) grants nothing — no free tier', () => {
    expect(planHasFeature(null, FEATURES.documentAnalysis)).toBe(false);
    expect(planHasFeature(null, FEATURES.chatbotAdvanced)).toBe(false);
  });
});
