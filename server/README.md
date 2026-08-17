# Universal Admin AI — backend

Real API for the product described in `chats/chat1.md` and the follow-up
"PROMPT MAÎTRE" brief: auth, subscriptions/entitlements, document
upload+analysis, and a chatbot — backed by PostgreSQL via Prisma. Pairs
with the frontend in `../app`.

## Stack

Express + TypeScript, PostgreSQL (Prisma ORM), argon2 password hashing,
httpOnly session cookies, Stripe for payments, a pluggable `AIProvider`
for document analysis and chat.

## Setup

```bash
# 1. A local Postgres with two databases (dev + test)
createuser uaa --createdb   # or use an existing role
createdb -O uaa uaa_dev
createdb -O uaa uaa_test

# 2. Env
cp .env.example .env
cp .env.example .env.test   # then edit DATABASE_URL to point at uaa_test
# generate SESSION_SECRET: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. Install, migrate, seed
npm install
npm run prisma:migrate            # applies migrations to .env's DB
npm run prisma:migrate:test       # applies migrations to .env.test's DB
npm run prisma:seed               # seeds the promotion + country profiles

# 4. Run
npm run dev       # http://localhost:4000
npm test          # 28 tests — unit + integration, against uaa_test
npm run build && npm start   # production build
```

## What's real vs. what needs configuration

| Area | Status |
| --- | --- |
| Auth (signup/login/sessions/rate-limiting) | Real. argon2, httpOnly cookies, DB-backed sessions, revocation. |
| Entitlements (Standard vs Premium gating) | Real, backend-enforced on every route — see `middleware/entitlements.ts`. |
| Promotion anti-abuse (20€ once-ever) | Real. Enforced by a Postgres unique constraint (`PromotionRedemption`), not application logic alone. Survives cancel/resubscribe — see `test/unit/promotion.test.ts` and `test/integration/subscriptions.webhook.test.ts`. |
| Stripe checkout/webhooks | Real code, **requires real Stripe keys** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STANDARD`, `STRIPE_PRICE_PREMIUM`) to actually process a payment. Without them, `/api/subscriptions/checkout` returns `503 configuration_required` and the frontend shows that honestly instead of a working button. Webhook signature verification and event handling are tested locally without a live account (see below). |
| Document upload + text extraction | Real for PDFs and plain text (`pdf-parse`, offline). **Image OCR is not implemented** — needs a real OCR engine or cloud Vision API; uploaded photos are stored and viewable but not text-analyzed. See `src/services/extractText.ts`. |
| Document analysis / chatbot | Real pipeline, pluggable `AIProvider`. Ships with `MockAIProvider` (deterministic, regex-based — never invents facts, honestly reports low confidence when it can't find something). `AnthropicAIProvider` is fully implemented but requires `ANTHROPIC_API_KEY` + `AI_PROVIDER=anthropic` to activate; untested against a live model in this environment. |
| Per-user document isolation | Real. Every document route checks ownership; covered by `test/integration/documents.idor.test.ts`. |
| Upload validation | Real magic-byte sniffing against the claimed Content-Type (`lib/fileSniff.ts`). **No AV/malware scanning** — needs an external scanner (e.g. ClamAV, a cloud provider). |
| Signed file URLs | Real (HMAC-signed, short-lived, bound to the requesting user) — the local-disk equivalent of S3 presigned URLs. Swapping to real object storage means reimplementing `services/storage`'s three methods. |
| i18n | Real key-based i18n on the frontend (fr/en/es/de). Backend notification text: fr/en only. API error messages are still hardcoded French. See `locales/README.md`. |
| Audit logs / security events | Real — written on auth, entitlement denials, uploads, deletions, spoofed-upload attempts. |
| Data export / account deletion | Real (`GET /api/account/export`, `DELETE /api/account`). Deletion is a soft delete; a scheduled hard-delete job for storage + PII after a retention window is not implemented. |
| Job queue for long analyses | **Not implemented.** Document analysis currently runs inline in the upload request. Fine for small files against the mock provider; a production deployment processing large PDFs or slow AI calls should move this to a queue (e.g. BullMQ + Redis) so uploads return immediately and analysis happens asynchronously — flagged, not built. |
| MFA/2FA, connected-devices UI | Schema exists (`User.mfaEnabled/mfaSecret`, `ConnectedDevice`), no endpoints implemented yet. |

## Architecture

- `prisma/schema.prisma` — the full data model (users, subscriptions,
  promotions, documents, tasks, conversations, audit/security logs,
  country profiles — see spec section 25/26).
- `src/services/entitlements.ts` — the Standard/Premium feature matrix;
  `middleware/entitlements.ts` enforces it server-side on every route.
- `src/services/stripe/index.ts` — checkout session creation, webhook
  handling (idempotent — see `ProcessedWebhookEvent`), and the promotion
  eligibility logic.
- `src/services/ai/` — the `AIProvider` interface + `MockAIProvider` +
  `AnthropicAIProvider` (spec section 42: swap providers without touching
  the rest of the app).
- `src/services/storage/` — per-user-isolated file storage abstraction.
- `test/` — 28 tests. `test/integration/subscriptions.webhook.test.ts`
  proves the Stripe webhook handler and the promotion anti-abuse rule work
  correctly *without* a live Stripe account, by signing hand-built events
  with the same local HMAC verification Stripe itself uses.
