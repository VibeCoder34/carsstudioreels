export type LanguageCode = "tr" | "en" | "es" | "fr" | "de" | "it" | "ru" | "pt";

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  tr: "Türkçe",
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  ru: "Русский",
  pt: "Português",
};

export const LANGUAGE_OPTIONS: readonly { code: LanguageCode; label: string }[] =
  (Object.entries(LANGUAGE_LABELS) as [LanguageCode, string][]).map(
    ([code, label]) => ({ code, label })
  );

export function parseLanguageCode(raw: unknown, fallback: LanguageCode = "tr"): LanguageCode {
  switch (raw) {
    case "tr":
    case "en":
    case "es":
    case "fr":
    case "de":
    case "it":
    case "ru":
    case "pt":
      return raw;
    default:
      return fallback;
  }
}

