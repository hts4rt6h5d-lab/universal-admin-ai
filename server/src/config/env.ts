import { z } from 'zod';

// Fail fast and loud if the environment is misconfigured, rather than
// limping along with undefined secrets (spec section 37: no real secrets
// in the repo, everything comes from the environment).
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  WEB_ORIGIN: z.string().url(),

  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
  STRIPE_PRICE_STANDARD: z.string().optional().default(''),
  STRIPE_PRICE_PREMIUM: z.string().optional().default(''),

  AI_PROVIDER: z.enum(['mock', 'anthropic']).default('mock'),
  ANTHROPIC_API_KEY: z.string().optional().default(''),

  STORAGE_ROOT: z.string().min(1).default('./storage'),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(25),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration — see above.');
}

export const env = parsed.data;

export const stripeConfigured = Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
export const aiConfigured = env.AI_PROVIDER === 'anthropic' ? Boolean(env.ANTHROPIC_API_KEY) : true;
