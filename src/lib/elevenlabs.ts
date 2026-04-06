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

function getEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export function getElevenLabsConfig() {
  const apiKey = getEnv("ELEVENLABS_API_KEY");
  const baseUrl = getEnv("ELEVENLABS_BASE_URL") ?? "https://api.elevenlabs.io";
  const defaultVoiceId = getEnv("ELEVENLABS_VOICE_ID");
  const defaultModelId = getEnv("ELEVENLABS_MODEL_ID") as ElevenLabsModelId | undefined;
  const defaultOutputFormat = getEnv("ELEVENLABS_OUTPUT_FORMAT") as ElevenLabsOutputFormat | undefined;

  return { apiKey, baseUrl, defaultVoiceId, defaultModelId, defaultOutputFormat };
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
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${body || res.statusText}`);
  }

  const audio = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") ?? "audio/mpeg";
  return { audio, contentType };
}

