# Universal Admin AI — frontend

A React implementation of the `Universal Admin AI.dc.html` design (see
`../project/`, `../README.md`, `../chats/chat1.md` for the original design
handoff), now wired to the real backend in `../server`.

- Real signup/login, real Standard/Premium subscription selection (with
  backend-computed promo pricing), real document upload + analysis, real
  tasks/documents/chatbot backed by the API — no more scripted/fake data
  for any of these. See `../server/README.md` for exactly what's "real"
  vs. what still needs external configuration (Stripe keys, an AI provider
  key) — the UI itself shows an honest "configuration requise" state
  wherever the backend reports something isn't configured, rather than
  faking success.
- Visual styling is the **Nocturne** design system, ported as-is from
  `project/_ds/.../styles.css` (`src/nocturne.css`).
- Real key-based i18n (`src/i18n/`) — fr/en/es/de — auto-detected from the
  browser, switchable, persisted. Currently wired into the auth/onboarding
  screens; the original dashboard screens (Home/Documents/Tasks/etc.)
  still use hardcoded French strings and haven't been migrated to
  translation keys yet.
- Icons ([Phosphor](https://phosphoricons.com)) and Inter are bundled
  locally rather than loaded from a CDN.

## Structure

- `src/App.jsx` — the auth gate: loading → signed-out (signup/login) →
  signed-in-no-plan (subscription screen) → `Dashboard`.
- `src/auth/AuthContext.jsx` — session state, backed by `GET /api/auth/me`.
- `src/api/client.js` — thin fetch wrapper (cookies, JSON, typed errors).
- `src/Dashboard.jsx` — the main app once a user has an active plan: real
  document upload/analysis, tasks, document library, chatbot (Premium
  only, matching the backend's entitlement gate), profile.
- `src/screens/` — one component per screen; `src/screens/auth/` holds
  signup, login, and plan selection.
- `src/i18n/` — i18next setup + locale JSON files.

## Run it

Needs the backend running too (see `../server/README.md`).

```bash
cp .env.example .env.local   # points at the local API, defaults are fine
npm install
npm run dev      # dev server, expects the API on :4000
npm run build    # production build
```
