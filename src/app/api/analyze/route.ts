import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { FIXED_CATEGORY_IDS } from "@/lib/photoCategories";

const client = new Anthropic();

interface PhotoInput {
  index: number;
  base64: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const photos: PhotoInput[] = body.photos ?? body.frames?.map((f: { index: number; base64Frames?: string[] }) => ({
      index: f.index,
      base64: f.base64Frames?.[0] ?? "",
    })) ?? [];

    const clean = photos.filter((p) => p.base64 && typeof p.index === "number");
    if (!clean.length) {
      return NextResponse.json({ error: "Fotoğraf bulunamadı" }, { status: 400 });
    }

    const contentBlocks: Anthropic.MessageParam["content"] = [];

    for (const p of clean) {
      contentBlocks.push({
        type: "text",
        text: `── Photo index ${p.index} ──`,
      });
      contentBlocks.push({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: p.base64 },
      });
    }

    const fixedList = FIXED_CATEGORY_IDS.join('", "');

    const promptText = `You are an expert automotive listing photo analyst and video storyboard director.

INPUT: ${clean.length} car photos (JPEG). Each is labeled with its index (0-based).

TASK A — For EVERY photo, write a short critique in Turkish (comment_tr): composition, lighting, sharpness, suitability for a premium horizontal (16:9) showcase video.

TASK B — Assign exactly ONE unique category_id per photo. Rules:
1) PREFER these fixed English snake_case ids when the photo clearly matches (use each at most ONCE across all photos):
   "${fixedList}"
2) If a photo does not fit any fixed slot, invent a specific English snake_case id (e.g. fender, mirror, badge, undercarriage).
3) If more photos remain than fixed slots, EVERY extra photo MUST get its OWN distinct dynamic category_id (never reuse an id for two photos).
4) If one photo clearly shows two regions (e.g. front + side), create ONE new combined English id like "front_left_corner" (still unique).
5) category_label_en: short human-readable English label for on-screen display.

TASK C — Build storyboard order: order shots for a cinematic 16:9 horizontal video (priority over vertical). Start with strongest exterior, flow logically around the car, interior/detail near the end unless a photo is clearly the hero opener.

TASK D — Duration: target total CONTENT duration ~30–40 seconds at 30fps BEFORE outro (roughly 900–1200 frames total for all shots combined). Split duration_frames across storyboard shots accordingly (longer holds for hero shots). Each shot: duration_frames between 36 and 200.

TASK E — scene_variant per shot (English, one of):
   "full_bleed" | "slide_entry_left" | "slide_entry_right" | "push_horizontal" | "color_wash" | "split_band" | "ken_zoom_slow"

Also set quality_score (1-10), lighting: "excellent"|"good"|"average"|"poor".

OUTPUT: ONLY valid JSON (no markdown):
{
  "storyboard": [
    {
      "source_index": 0,
      "category_id": "front",
      "category_label_en": "Front",
      "comment_tr": "Türkçe yorum",
      "quality_score": 8,
      "lighting": "good",
      "duration_frames": 120,
      "scene_variant": "slide_entry_left"
    }
  ],
  "editing_notes_tr": "Kısa Türkçe genel kurgu notu",
  "outro_frames": 90
}

The storyboard array MUST include exactly one entry per photo index (${clean.length} entries). Each source_index must appear exactly once. Sum of duration_frames should land near 1050 (±150) for ~35s content before outro.`;

    contentBlocks.push({ type: "text", text: promptText });

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: contentBlocks }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const rawText = textBlock?.type === "text" ? textBlock.text : "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("Claude geçerli JSON döndürmedi: " + rawText.slice(0, 200));
    }

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error("[/api/analyze]", err);
    return NextResponse.json(
      { error: "Analiz başarısız", details: String(err) },
      { status: 500 }
    );
  }
}
