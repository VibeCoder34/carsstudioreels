import OpenAI from "openai";

/**
 * Model seçimi — endpoint başına ayrı env veya tek `OPENAI_MODEL` (geriye dönük).
 *
 * Varsayılan strateji (maliyet / kalite):
 * - identify: `gpt-4o-mini` — kısa JSON, birkaç foto; genelde yeterli ve ucuz.
 * - analyze: `gpt-4o` — uzun prompt, çok görsel, büyük JSON; daha güvenilir.
 */
const DEFAULT_IDENTIFY_MODEL = "gpt-4o-mini";
const DEFAULT_ANALYZE_MODEL = "gpt-4o";

function pickModel(
  specific: string | undefined,
  legacyGlobal: string | undefined,
  fallback: string,
): string {
  const s = specific?.trim();
  if (s) return s;
  const g = legacyGlobal?.trim();
  if (g) return g;
  return fallback;
}

export function getOpenAI(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/** `/api/identify` — ilan alanları çıkarma */
export function getOpenAIModelIdentify(): string {
  return pickModel(process.env.OPENAI_MODEL_IDENTIFY, process.env.OPENAI_MODEL, DEFAULT_IDENTIFY_MODEL);
}

/** `/api/analyze` — storyboard + uzun JSON */
export function getOpenAIModelAnalyze(): string {
  return pickModel(process.env.OPENAI_MODEL_ANALYZE, process.env.OPENAI_MODEL, DEFAULT_ANALYZE_MODEL);
}
