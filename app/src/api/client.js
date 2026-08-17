// In production this defaults to a same-origin relative path: the Vercel
// deploy proxies /api/* to the Railway backend (see vercel.json), so the
// browser only ever talks to one origin and session cookies work as
// ordinary first-party cookies — important for Safari/iOS, which blocks
// third-party cookies by default. Local dev overrides this via .env.local.
const API_URL = import.meta.env.VITE_API_URL || '/api';

// For places that need a URL string directly (an <img>/<iframe> src or
// `href`, not a fetch() call) — same base as API_URL. In dev that's
// absolute (http://localhost:4000/api/...); in prod it's root-relative
// (/api/...), which the browser resolves against the page's own origin —
// exactly what we want since that's the same origin Vercel proxies to
// Railway.
export function resolveApiUrl(path) {
  return `${API_URL}${path}`;
}

// Same idea, but for a path the backend already returned as a full
// server-root path including "/api" (e.g. the `url` field from
// GET /documents/:id/file-url) — used as-is in prod, prefixed with just
// the API origin (no extra "/api") in dev.
export function resolveServerPath(rootPath) {
  const origin = import.meta.env.VITE_API_URL ? API_URL.replace(/\/api\/?$/, '') : '';
  return `${origin}${rootPath}`;
}

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(path, { method = 'GET', body, isFormData = false } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      headers: isFormData ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'network', "Impossible de contacter le serveur. Vérifiez votre connexion.");
  }

  if (res.status === 204) return null;

  let json = null;
  try {
    json = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    const err = json?.error;
    throw new ApiError(res.status, err?.code || 'unknown', err?.message || 'Une erreur inattendue est survenue.');
  }
  return json;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path, body) => request(path, { method: 'DELETE', body }),
  upload: (path, formData) => request(path, { method: 'POST', body: formData, isFormData: true }),
};
