import type { MediaItem } from "@/remotion/PrestigeReels";
import type { StoryboardShot } from "@/lib/storyboard";
import { getAudioDurationSecondsFromUrl } from "@/lib/audioDuration";
import { ELEVENLABS_PAID_PLAN_HINT } from "@/lib/elevenlabs";

const FPS = 30;
const MIN_FRAMES = 90;

export type VoiceoverLanguage = "tr" | "en";

export type AttachVoiceoverResult = {
  items: MediaItem[];
  /** Örn. ücretsiz planda kütüphane sesi — kalan TTS çağrıları atlanır. */
  ttsError?: string;
  /** Bazı sahnelerde ses üretilemedi (metin vardı ama API hata verdi). */
  ttsPartialFailure?: boolean;
};

async function readTtsErrorBody(res: Response): Promise<{
  code?: string;
  details?: string;
}> {
  const text = await res.text().catch(() => "");
  try {
    const j = JSON.parse(text) as { code?: string; details?: string; error?: string };
    return {
      code: j.code,
      details: j.details ?? j.error ?? text,
    };
  } catch {
    return { details: text || String(res.status) };
  }
}

/**
 * Her sahne için TTS üretir; sahne süresini ses süresine göre uzatır (ses bitmeden kesilmez).
 * Sıralı timeline: çakışma yok (Remotion'da crossfade 0 + Audio Sequence).
 */
export async function attachVoiceoverAudioToMediaItems(
  items: MediaItem[],
  shots: StoryboardShot[],
  language: VoiceoverLanguage
): Promise<AttachVoiceoverResult> {
  const out: MediaItem[] = [];
  let ttsError: string | undefined;
  let ttsPartialFailure = false;
  /** Aynı faturalama/plan hatasında gereksiz istek atma */
  let skipRemainingTts = false;

  for (let i = 0; i < items.length; i++) {
    const text = (shots[i]?.voiceover_text ?? "").trim();
    const prev = items[i];
    if (!text) {
      out.push({ ...prev });
      continue;
    }

    if (skipRemainingTts) {
      out.push({ ...prev });
      continue;
    }

    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        language,
        outputFormat: "mp3_44100_128",
      }),
    });

    if (!res.ok) {
      const errBody = await readTtsErrorBody(res);
      if (res.status === 402 && errBody.code === "paid_plan_required") {
        ttsError = errBody.details ?? ELEVENLABS_PAID_PLAN_HINT;
        skipRemainingTts = true;
        console.warn("[voiceover] ElevenLabs TTS blocked (402):", ttsError);
      } else {
        ttsPartialFailure = true;
        console.warn("[voiceover] TTS failed for shot", i, errBody.details ?? res.status);
      }
      out.push({ ...prev });
      continue;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    let sec: number;
    try {
      sec = await getAudioDurationSecondsFromUrl(url);
    } catch {
      URL.revokeObjectURL(url);
      ttsPartialFailure = true;
      out.push({ ...prev });
      continue;
    }

    const audioFrames = Math.max(1, Math.ceil(sec * FPS));
    const visualFrames = prev.durationFrames ?? MIN_FRAMES;
    const durationFrames = Math.max(visualFrames, audioFrames, MIN_FRAMES);

    out.push({
      ...prev,
      durationFrames,
      audioSrc: url,
      voiceoverText: text,
    });
  }
  return { items: out, ttsError, ttsPartialFailure };
}

export function revokeVoiceoverObjectUrls(items: MediaItem[]): void {
  for (const m of items) {
    const u = m.audioSrc;
    if (u?.startsWith("blob:")) URL.revokeObjectURL(u);
  }
}
