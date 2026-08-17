# Server-rendered translations

Key-based, same pattern as `app/src/i18n/locales/` (spec section 17: never
hardcode user-facing strings; use translation keys everywhere, including
notifications).

This directory only covers the small set of strings the *backend* renders
directly — currently just transactional notification bodies (see
`src/lib/notifications-i18n.ts`), used from the Stripe webhook handler for
things like "payment failed" emails.

**Coverage: fr, en only.** The interface itself (all UI strings) lives in
`app/src/i18n/locales/` and covers fr/en/es/de. Everything else the product
brief asks to be translatable — chatbot responses, document summaries,
error messages returned by the API — is not yet routed through a
translation layer: API error messages are still hardcoded French (see
`src/lib/errors.ts`), and AI-generated text is in whatever language the
provider responds in. Wiring those up means: (1) having `errors.ts` take a
locale and use a catalog like this one, and (2) passing the user's locale
into the AI provider's prompts. Neither is implemented here — flagged
honestly rather than left silently incomplete.

To add a language: drop in `<locale>/notifications.json` with the same
keys as `fr/notifications.json`, then add it to the `CATALOGS` map in
`src/lib/notifications-i18n.ts`.
