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

TASK C — Build storyboard order AND scene rhythm. Follow this arc for a compelling car commercial feel:
  ACT 1 — HOOK (shots 1–2): Strong exterior opener. Use "ken_zoom_slow" or "slide_entry_left" for the hero shot. Fast — 80–100 frames. Create immediate impact.
  ACT 2 — TOUR (shots 3–5): Flow around the car (front → side → rear or similar logical path). Mix "full_bleed", "push_horizontal", "color_wash". 70–100 frames each. Keep energy up.
  ACT 3 — SHOWCASE (shots 5–8): This is the heart. Use layout variants that give designed, editorial feel:
    • Use "duo_split" for complementary pairs (e.g., front + rear, left + right exterior, exterior + detail)
    • Use "trio_mosaic" once to show multiple angles simultaneously — great mid-video montage moment
    • Use "card_panel" for engine, cockpit, or wheel shots WITH their spec data
    • Use "letter_box" for a wide dramatic exterior shot
    Assign 130–200 frames for these.
  ACT 4 — CLIMAX (last 2 shots before outro): Use "feature_hero" for the big performans reveal (engine or best exterior). Then "letter_box" or "split_band" for the final shot before outro. 150–200 frames.

  RHYTHM RULES:
  - Never place 3 consecutive full_bleed shots
  - Vary between fast (60–90f) and slow (150–200f) to create pulse
  - Place "duo_split" and "trio_mosaic" in the middle third of the video
  - End strong: feature_hero or letter_box before outro

TASK D — Duration: target total CONTENT duration ~36–42 seconds at 30fps BEFORE outro (roughly 1080–1260 frames total for all shots combined). Split duration_frames across storyboard shots accordingly. Rules:
   - Regular shots (full_bleed, slide_entry_*, push_horizontal, color_wash, split_band, ken_zoom_slow, callout): 60–120 frames each.
   - Layout shots (card_panel, letter_box, feature_hero): 150–220 frames each — these show data, viewers need time to read.
   - Hero opener shot: 90–150 frames.
   - Each shot: minimum 60 frames, maximum 240 frames.

TASK E — scene_variant per shot (English, one of):
   "full_bleed" | "slide_entry_left" | "slide_entry_right" | "push_horizontal" | "color_wash" | "split_band" | "ken_zoom_slow" | "callout" | "card_panel" | "letter_box" | "feature_hero"

   PREMIUM LAYOUT VARIANTS — these give a designed, editorial feel (photo is NOT full-screen):
   - "card_panel": Photo sits as a padded card with rounded corners on the LEFT side of a dark background. Data table on the RIGHT. Auto-selects by category: engine→HP/torque/0-100 bars, cockpit→feature checklist, tire/wheel→brake specs, exterior→dimensions. Best for: engine, cockpit, wheel, profile shots. Assign 150–220 frames. Use 2–3 times.
   - "letter_box": Cinematic letterbox — photo fills full width but only CENTER 66% of height. Top dark bar: category label. Bottom dark bar: brand / model / year / price as animated stats. Great for wide exterior shots, panoramic views. Assign 100–160 frames. Use 1–2 times.
   - "feature_hero": Large rounded photo card in upper 60%. Below: 3 huge gold stats (190 HP · 400 Nm · 7.2 sn) animate in dramatically. Best for the engine or the big exterior reveal before outro. Assign 150–200 frames. Use once, ideally near the end.

   MOTION VARIANTS — for regular full-screen shots:
   - "full_bleed": Standard Ken Burns. Default.
   - "slide_entry_left" / "slide_entry_right": Slide in from that side.
   - "push_horizontal": Horizontal push pan.
   - "color_wash": Subtle color pulse. Good for moody exterior shots.
   - "split_band": Photo top 72%, bottom band shows category label. Profile shots.
   - "ken_zoom_slow": Very slow majestic zoom. Hero shots.
   - "callout": Full-bleed + pulsing gold dot + line + label bubble. Detail close-ups only (badge, headlight, wheel detail). Assign 80–120 frames.
   - "duo_split": TWO photos side by side as cards on dark background. This shot shows items[index] AND items[index+1] simultaneously. Use for complementary angle pairs: front+rear, left+right, exterior+detail. Assign 130–160 frames. Use 1–2 times.
   - "trio_mosaic": ONE large photo (left 63%) + TWO small photos stacked (right 37%) as cards. Shows items[index], [index+1], [index+2] simultaneously. Great for a mid-video "montage moment" showing multiple exterior angles at once. Assign 150–180 frames. Use once.

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

The storyboard array MUST include exactly one entry per photo index (${clean.length} entries). Each source_index must appear exactly once. Sum of duration_frames should land near 1080–1260 for ~36–42s content before outro. Data overlay shots (spec_table, side_table, split_specs, floating_card) must have duration_frames ≥ 150.`;

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
