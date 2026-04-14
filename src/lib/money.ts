import type { LanguageCode } from "@/lib/languages";

export type CurrencyCode = "TRY" | "USD" | "EUR" | "GBP" | "RUB";

export function defaultCurrencyForLanguage(lang: LanguageCode): CurrencyCode {
  switch (lang) {
    case "tr":
      return "TRY";
    case "ru":
      return "RUB";
    case "en":
      return "USD";
    case "de":
    case "fr":
    case "es":
    case "it":
    case "pt":
      return "EUR";
    default:
      return "USD";
  }
}

export function localeForLanguage(lang: LanguageCode): string {
  switch (lang) {
    case "tr":
      return "tr-TR";
    case "en":
      return "en-US";
    case "es":
      return "es-ES";
    case "fr":
      return "fr-FR";
    case "de":
      return "de-DE";
    case "it":
      return "it-IT";
    case "ru":
      return "ru-RU";
    case "pt":
      return "pt-PT";
    default:
      return "en-US";
  }
}

function parseLooseNumber(raw: string): number | null {
  const s0 = raw.trim();
  if (!s0) return null;

  // Keep digits, separators, minus. Drop currency symbols / letters.
  let s = s0.replace(/[^\d.,\-]/g, "");
  if (!s) return null;

  // If both separators exist, treat the last occurrence as decimal separator.
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot !== -1 && lastComma !== -1) {
    const decimalSep = lastDot > lastComma ? "." : ",";
    const groupSep = decimalSep === "." ? "," : ".";
    s = s.split(groupSep).join("");
    if (decimalSep === ",") s = s.replace(",", ".");
  } else if (lastComma !== -1 && lastDot === -1) {
    // Only comma present. Heuristic: if it looks like thousands separator (e.g. 1,234,567) remove all commas.
    const parts = s.split(",");
    const last = parts[parts.length - 1] ?? "";
    const looksLikeDecimal = last.length > 0 && last.length <= 2;
    if (!looksLikeDecimal) {
      s = parts.join("");
    } else {
      s = s.replace(",", ".");
    }
  } else {
    // Only dot present: treat as thousands if 3-digit trailing groups and multiple dots.
    const dotParts = s.split(".");
    if (dotParts.length > 2) {
      s = dotParts.join("");
    }
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function formatPrice(
  rawPrice: string | undefined,
  opts: {
    language: LanguageCode;
    currency?: CurrencyCode;
    maximumFractionDigits?: number;
    /** "number" => 2.850.000 | "currency" => ₺2.850.000 (locale-aware) */
    style?: "number" | "currency";
  }
): string | undefined {
  const t = rawPrice?.trim();
  if (!t) return rawPrice;

  const amount = parseLooseNumber(t);
  if (amount === null) return t;

  const locale = localeForLanguage(opts.language);
  const maximumFractionDigits = opts.maximumFractionDigits ?? 0;
  const style = opts.style ?? "currency";

  try {
    if (style === "number") {
      return new Intl.NumberFormat(locale, {
        style: "decimal",
        useGrouping: true,
        maximumFractionDigits,
      }).format(amount);
    }

    const currency = opts.currency ?? defaultCurrencyForLanguage(opts.language);
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits,
    }).format(amount);
  } catch {
    return t;
  }
}

