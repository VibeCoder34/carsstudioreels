export type ElevenLabsOutputFormat =
  | "mp3_22050_32"
  | "mp3_44100_64"
  | "mp3_44100_128"
  | "mp3_44100_192";

export type ElevenLabsModelId =
  | "eleven_multilingual_v2"
  | "eleven_turbo_v2"
  | "eleven_turbo_v2_5"
  | (string & {});

export type ElevenLabsVoiceSettings = {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
};

/** Desteklenen seslendirme dilleri (yalnızca TR / EN). */
export type TtsLanguage = "tr" | "en";

export const TTS_LANGUAGES: readonly TtsLanguage[] = ["tr", "en"];

export function parseTtsLanguage(raw: unknown): TtsLanguage {
  if (raw === "tr" || raw === "en") return raw;
  if (raw === undefined || raw === null || raw === "") return "tr";
  throw new Error('Invalid language: use "tr" or "en"');
}

export type ElevenLabsTtsRequest = {
  text: string;
  voiceId: string;
  modelId?: ElevenLabsModelId;
  outputFormat?: ElevenLabsOutputFormat;
  voiceSettings?: ElevenLabsVoiceSettings;
};

export type ElevenLabsTtsResult = {
  audio: ArrayBuffer;
  contentType: string;
};

/** ElevenLabs HTTP hatası — API route’da `instanceof` ile yakalanır. */
export class ElevenLabsTtsHttpError extends Error {
  readonly status: number;
  readonly apiCode?: string;
  readonly rawBody: string;

  constructor(opts: {
    status: number;
    apiCode?: string;
    rawBody: string;
    message: string;
  }) {
    super(opts.message);
    this.name = "ElevenLabsTtsHttpError";
    this.status = opts.status;
    this.apiCode = opts.apiCode;
    this.rawBody = opts.rawBody;
  }
}

/** Ücretsiz planda kütüphane voice ID’leri API’de engellenebilir. */
export const ELEVENLABS_PAID_PLAN_HINT =
  "Ücretsiz ElevenLabs hesabında kütüphane (library) sesleri API üzerinden kullanılamaz. Plan yükseltin veya ELEVENLABS_VOICE_ID_TR / ELEVENLABS_VOICE_ID_EN olarak kendi oluşturduğunuz sesin ID’sini kullanın (ör. Instant Voice Clone). — Free tier: use a custom voice ID you own, not a library voice.";

function parseElevenLabsErrorBody(text: string): {
  apiCode?: string;
  message?: string;
} {
  try {
    const j = JSON.parse(text) as { detail?: unknown };
    const d = j.detail;
    if (d && typeof d === "object" && d !== null) {
      const o = d as Record<string, unknown>;
      return {
        apiCode: typeof o.code === "string" ? o.code : undefined,
        message: typeof o.message === "string" ? o.message : undefined,
      };
    }
    if (typeof d === "string") {
      return { message: d };
    }
  } catch {
    /* ignore */
  }
  return {};
}

function getEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export type ElevenLabsConfig = {
  apiKey: string | undefined;
  baseUrl: string;
  /** Tek voice ile her iki dil (önerilmez); dil bazlı voice yoksa fallback. */
  defaultVoiceId: string | undefined;
  voiceIdTr: string | undefined;
  voiceIdEn: string | undefined;
  defaultModelId: ElevenLabsModelId | undefined;
  modelIdTr: ElevenLabsModelId | undefined;
  modelIdEn: ElevenLabsModelId | undefined;
  defaultOutputFormat: ElevenLabsOutputFormat | undefined;
  defaultLanguage: TtsLanguage;
};

export function getElevenLabsConfig(): ElevenLabsConfig {
  const apiKey = getEnv("ELEVENLABS_API_KEY");
  const baseUrl = getEnv("ELEVENLABS_BASE_URL") ?? "https://api.elevenlabs.io";
  const defaultVoiceId = getEnv("ELEVENLABS_VOICE_ID");
  const voiceIdTr = getEnv("ELEVENLABS_VOICE_ID_TR");
  const voiceIdEn = getEnv("ELEVENLABS_VOICE_ID_EN");
  const defaultModelId = getEnv("ELEVENLABS_MODEL_ID") as ElevenLabsModelId | undefined;
  const modelIdTr = getEnv("ELEVENLABS_MODEL_ID_TR") as ElevenLabsModelId | undefined;
  const modelIdEn = getEnv("ELEVENLABS_MODEL_ID_EN") as ElevenLabsModelId | undefined;
  const defaultOutputFormat = getEnv("ELEVENLABS_OUTPUT_FORMAT") as ElevenLabsOutputFormat | undefined;
  const dl = getEnv("ELEVENLABS_DEFAULT_LANGUAGE")?.toLowerCase();
  const defaultLanguage: TtsLanguage = dl === "en" ? "en" : "tr";

  return {
    apiKey,
    baseUrl,
    defaultVoiceId,
    voiceIdTr,
    voiceIdEn,
    defaultModelId,
    modelIdTr,
    modelIdEn,
    defaultOutputFormat,
    defaultLanguage,
  };
}

/** Dil için voice: önce dil-özel env, sonra genel ELEVENLABS_VOICE_ID. */
export function resolveVoiceIdForLanguage(lang: TtsLanguage, cfg: ElevenLabsConfig): string | undefined {
  const specific = lang === "tr" ? cfg.voiceIdTr : cfg.voiceIdEn;
  return (specific ?? cfg.defaultVoiceId)?.trim() || undefined;
}

/** Dil için model: önce dil-özel env, sonra ELEVENLABS_MODEL_ID. */
export function resolveModelIdForLanguage(lang: TtsLanguage, cfg: ElevenLabsConfig): ElevenLabsModelId | undefined {
  const specific = lang === "tr" ? cfg.modelIdTr : cfg.modelIdEn;
  return specific ?? cfg.defaultModelId;
}

export async function elevenLabsTts(req: ElevenLabsTtsRequest): Promise<ElevenLabsTtsResult> {
  const { apiKey, baseUrl } = getElevenLabsConfig();
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is missing");
  }
  if (!req.voiceId) {
    throw new Error("voiceId is required");
  }
  const text = req.text?.trim();
  if (!text) {
    throw new Error("text is required");
  }

  const url = new URL(`/v1/text-to-speech/${encodeURIComponent(req.voiceId)}`, baseUrl);
  if (req.outputFormat) url.searchParams.set("output_format", req.outputFormat);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: req.modelId,
      voice_settings: req.voiceSettings,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const parsed = parseElevenLabsErrorBody(body);
    const apiCode = parsed.apiCode;
    const upstream = parsed.message;

    let message: string;
    if (res.status === 402 && apiCode === "paid_plan_required") {
      message = ELEVENLABS_PAID_PLAN_HINT;
    } else {
      message =
        upstream?.trim() ||
        `ElevenLabs TTS failed (${res.status}): ${body || res.statusText}`;
    }

    throw new ElevenLabsTtsHttpError({
      status: res.status,
      apiCode,
      rawBody: body,
      message,
    });
  }

  const audio = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") ?? "audio/mpeg";
  return { audio, contentType };
}

