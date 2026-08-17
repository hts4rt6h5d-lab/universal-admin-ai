import { env } from '../../config/env.js';
import type { AIProvider } from './types.js';
import { MockAIProvider } from './MockAIProvider.js';
import { AnthropicAIProvider } from './AnthropicAIProvider.js';

export type { AIProvider } from './types.js';
export * from './types.js';

// The rest of the app depends only on the AIProvider interface (spec
// section 42) — swapping models/vendors means adding a new class here and
// changing AI_PROVIDER, nothing else.
let cached: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (cached) return cached;
  if (env.AI_PROVIDER === 'anthropic' && env.ANTHROPIC_API_KEY) {
    cached = new AnthropicAIProvider(env.ANTHROPIC_API_KEY);
  } else {
    cached = new MockAIProvider();
  }
  return cached;
}
