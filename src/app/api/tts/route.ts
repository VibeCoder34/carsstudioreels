import { NextRequest, NextResponse } from "next/server";
import { elevenLabsTts, getElevenLabsConfig, type ElevenLabsVoiceSettings, type ElevenLabsOutputFormat, type ElevenLabsModelId } from "@/lib/elevenlabs";

export const runtime = "nodejs";

type Body = {
  text?: string;
  voiceId?: string;
  modelId?: ElevenLabsModelId;
  outputFormat?: ElevenLabsOutputFormat;
  voiceSettings?: ElevenLabsVoiceSettings;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const cfg = getElevenLabsConfig();

    const text = body.text?.trim() ?? "";
    const voiceId = (body.voiceId ?? cfg.defaultVoiceId ?? "").trim();
    const modelId = body.modelId ?? cfg.defaultModelId;
    const outputFormat = body.outputFormat ?? cfg.defaultOutputFormat ?? "mp3_44100_128";

    const { audio, contentType } = await elevenLabsTts({
      text,
      voiceId,
      modelId,
      outputFormat,
      voiceSettings: body.voiceSettings,
    });

    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
        "Content-Disposition": 'inline; filename="speech.mp3"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "TTS failed", details: message }, { status: 500 });
  }
}

