import { useCallback, useEffect, useMemo, useState } from "react";
import cnTranslations from "./locales/cn.json";
import enTranslations from "./locales/en.json";

export const I18N_STORAGE_KEY = "codex-react-ui.locale";

export const localeOptions = [
  { value: "en", label: "English" },
  { value: "zh", label: "中文" }
] as const;

export type Locale = (typeof localeOptions)[number]["value"];
export type TranslationKey = keyof typeof enTranslations;
export type TranslateFn = (key: TranslationKey, values?: Record<string, string | number>) => string;

const translations: Record<Locale, Record<TranslationKey, string>> = {
  en: enTranslations,
  zh: cnTranslations
};

export function useI18n() {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  useEffect(() => {
    localStorage.setItem(I18N_STORAGE_KEY, locale);
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  const t = useCallback<TranslateFn>(
    (key, values) => {
      const template: string = translations[locale][key] ?? translations.en[key] ?? key;
      if (!values) {
        return template;
      }
      return Object.entries(values).reduce<string>((current, [name, value]) => current.replaceAll(`{${name}}`, String(value)), template);
    },
    [locale]
  );

  return useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
}

function readStoredLocale(): Locale {
  const stored = localStorage.getItem(I18N_STORAGE_KEY);
  return stored === "zh" ? "zh" : "en";
}
