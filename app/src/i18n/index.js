import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr/common.json';
import en from './locales/en/common.json';
import es from './locales/es/common.json';
import de from './locales/de/common.json';

// Real key-based i18n architecture (spec section 17): screens read
// `t('namespace.key')`, never a hardcoded string, so a language can be
// added by dropping in one more locale/<code>/common.json — no component
// changes required. Only fr/en/es/de ship today; see server/locales's
// README for the full list the product brief asks for and how to extend
// this.
export const SUPPORTED_LOCALES = ['fr', 'en', 'es', 'de'];

const STORAGE_KEY = 'uaa_locale';

function detectInitialLocale() {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  if (stored && SUPPORTED_LOCALES.includes(stored)) return stored;
  const browser = typeof navigator !== 'undefined' ? navigator.language?.slice(0, 2) : null;
  if (browser && SUPPORTED_LOCALES.includes(browser)) return browser;
  return 'fr';
}

i18next.use(initReactI18next).init({
  resources: {
    fr: { common: fr },
    en: { common: en },
    es: { common: es },
    de: { common: de },
  },
  lng: detectInitialLocale(),
  fallbackLng: 'fr',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

i18next.on('languageChanged', (lng) => {
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, lng);
  if (typeof document !== 'undefined') document.documentElement.lang = lng;
});

export default i18next;
