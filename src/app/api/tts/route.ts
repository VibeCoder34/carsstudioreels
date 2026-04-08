import { NextRequest, NextResponse } from "next/server";
import {
  ElevenLabsTtsHttpError,
  elevenLabsTts,
  getElevenLabsConfig,
  parseTtsLanguage,
  resolveModelIdForLanguage,
  resolveVoiceIdForLanguage,
  type ElevenLabsVoiceSettings,
  type ElevenLabsOutputFormat,
  type ElevenLabsModelId,
  type TtsLanguage,
} from "@/lib/elevenlabs";

export const runtime = "nodejs";

type Body = {
  text?: string;
  /** `"tr"` | `"en"`. Varsayılan: env `ELEVENLABS_DEFAULT_LANGUAGE` veya `tr`. */
  language?: string;
  voiceId?: string;
  modelId?: ElevenLabsModelId;
  outputFormat?: ElevenLabsOutputFormat;
  voiceSettings?: ElevenLabsVoiceSettings;
};

export async function GET() {
  const cfg = getElevenLabsConfig();
  return NextResponse.json({
    languages: [
      { code: "tr" as const, label: "Türkçe" },
      { code: "en" as const, label: "English" },
      { code: "es" as const, label: "Español" },
      { code: "fr" as const, label: "Français" },
      { code: "de" as const, label: "Deutsch" },
      { code: "it" as const, label: "Italiano" },
      { code: "ru" as const, label: "Русский" },
      { code: "pt" as const, label: "Português" },
    ],
    defaultLanguage: cfg.defaultLanguage,
    envHints: {
      required: ["ELEVENLABS_API_KEY"],
      recommended: [
        "ELEVENLABS_VOICE_ID_TR",
        "ELEVENLABS_VOICE_ID_EN",
        "ELEVENLABS_VOICE_ID_ES",
        "ELEVENLABS_VOICE_ID_FR",
        "ELEVENLABS_VOICE_ID_DE",
        "ELEVENLABS_VOICE_ID_IT",
        "ELEVENLABS_VOICE_ID_RU",
        "ELEVENLABS_VOICE_ID_PT",
        "ELEVENLABS_MODEL_ID",
      ],
      optional: [
        "ELEVENLABS_VOICE_ID",
        "ELEVENLABS_MODEL_ID_TR",
        "ELEVENLABS_MODEL_ID_EN",
        "ELEVENLABS_MODEL_ID_ES",
        "ELEVENLABS_MODEL_ID_FR",
        "ELEVENLABS_MODEL_ID_DE",
        "ELEVENLABS_MODEL_ID_IT",
        "ELEVENLABS_MODEL_ID_RU",
        "ELEVENLABS_MODEL_ID_PT",
        "ELEVENLABS_OUTPUT_FORMAT",
        "ELEVENLABS_DEFAULT_LANGUAGE",
        "ELEVENLABS_BASE_URL",
      ],
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const cfg = getElevenLabsConfig();

    const text = body.text?.trim() ?? "";
    let language: TtsLanguage;
    try {
      language = body.language !== undefined && body.language !== ""
        ? parseTtsLanguage(body.language)
        : cfg.defaultLanguage;
    } catch {
      return NextResponse.json(
        {
          error: "Invalid language",
          details: 'Use one of "tr", "en", "es", "fr", "de", "it", "ru", "pt".',
        },
        { status: 400 }
      );
    }

    const voiceFromBody = body.voiceId?.trim();
    const voiceId =
      voiceFromBody ||
      resolveVoiceIdForLanguage(language, cfg) ||
      "";

    const modelId =
      body.modelId ?? resolveModelIdForLanguage(language, cfg);

    const outputFormat = body.outputFormat ?? cfg.defaultOutputFormat ?? "mp3_44100_128";

    if (!voiceId) {
      return NextResponse.json(
        {
          error: "Missing voice",
          details:
            "Set ELEVENLABS_VOICE_ID_TR / ELEVENLABS_VOICE_ID_EN (or ELEVENLABS_VOICE_ID), or pass voiceId in the JSON body.",
        },
        { status: 400 }
      );
    }

    const { audio, contentType } = await elevenLabsTts({
      text,
      voiceId,
      modelId,
      outputFormat,
      voiceSettings: body.voiceSettings,
    });

    const filename = `speech-${language}.mp3`;

    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
        "Content-Disposition": `inline; filename="${filename}"`,
        "X-TTS-Language": language,
      },
    });
  } catch (err) {
    if (err instanceof ElevenLabsTtsHttpError) {
      return NextResponse.json(
        {
          error: "TTS failed",
          code: err.apiCode,
          details: err.message,
        },
        { status: err.status }
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "TTS failed", details: message }, { status: 500 });
  }
}
