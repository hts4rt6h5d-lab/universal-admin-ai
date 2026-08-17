import fr from '../../locales/fr/notifications.json' with { type: 'json' };
import en from '../../locales/en/notifications.json' with { type: 'json' };

// Same key-based approach as the frontend (spec section 17: notifications
// are translated content, not hardcoded strings). Only fr/en exist here
// today — see server/locales/README.md for what's missing and why.
const CATALOGS: Record<string, typeof fr> = { fr, en };

type NotificationKey = keyof typeof fr;

export function renderNotification(locale: string, key: NotificationKey, vars: Record<string, string> = {}) {
  const catalog = CATALOGS[locale] ?? CATALOGS.fr;
  const entry = catalog[key];
  const interpolate = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
  return { title: interpolate(entry.title), body: interpolate(entry.body) };
}
