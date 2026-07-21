import { useCallback, useEffect, useMemo, useState } from "react";
import cnTranslations from "./locales/cn.json";
import deTranslations from "./locales/de.json";
import enTranslations from "./locales/en.json";
import esTranslations from "./locales/es.json";
import frTranslations from "./locales/fr.json";
import jaTranslations from "./locales/ja.json";
import koTranslations from "./locales/ko.json";
import ptTranslations from "./locales/pt.json";
import viTranslations from "./locales/vi.json";

export const I18N_STORAGE_KEY = "codex-react-ui.locale";

export const localeOptions = [
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
  { value: "pt", label: "Português" }
] as const;

export type Locale = (typeof localeOptions)[number]["value"];
export type TranslationKey = string;
export type TranslateFn = (key: TranslationKey, values?: Record<string, string | number>) => string;

const translations: Record<Locale, Record<string, string>> = {
  en: enTranslations,
  zh: cnTranslations,
  ja: jaTranslations,
  ko: koTranslations,
  vi: viTranslations,
  de: deTranslations,
  fr: frTranslations,
  es: esTranslations,
  pt: ptTranslations
};

const localeHtmlLang: Record<Locale, string> = {
  en: "en",
  zh: "zh-CN",
  ja: "ja",
  ko: "ko",
  vi: "vi",
  de: "de",
  fr: "fr",
  es: "es",
  pt: "pt"
};

const supportedLocales = new Set<string>(localeOptions.map((option) => option.value));

export function useI18n() {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  useEffect(() => {
    localStorage.setItem(I18N_STORAGE_KEY, locale);
    document.documentElement.lang = localeHtmlLang[locale] ?? "en";
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  const t = useCallback<TranslateFn>(
    (key, values) => {
      // Always fall back: incomplete locale packs must not crash the workbench.
      const pack = translations[locale] ?? translations.en;
      const template: string = pack[key] ?? translations.en[key] ?? key;
      if (!values) {
        return template;
      }
      return Object.entries(values).reduce<string>(
        (current, [name, value]) => current.replaceAll(`{${name}}`, String(value)),
        template
      );
    },
    [locale]
  );

  return useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
}

function readStoredLocale(): Locale {
  const stored = localStorage.getItem(I18N_STORAGE_KEY);
  if (stored && supportedLocales.has(stored)) {
    return stored as Locale;
  }
  return "en";
}
