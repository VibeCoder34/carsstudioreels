import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { FIXED_CATEGORY_IDS } from "@/lib/photoCategories";

const client = new Anthropic();

interface PhotoInput {
  index: number;
  base64: string;
  width?: number;
  height?: number;
}

function voiceoverLanguagePreamble(language: "tr" | "en"): string {
  if (language === "en") {
    return `━━ VOICEOVER LANGUAGE (HIGHEST PRIORITY) ━━
The field "voiceover_text" on EVERY storyboard shot MUST be written in ENGLISH ONLY — full sentences, natural spoken English.
TASK A still asks for "comment_tr" in Turkish: that is ONLY for on-screen notes. Do NOT copy Turkish from comment_tr into voiceover_text.
If voiceover_text contains any Turkish words when English is required, the output is INVALID — rewrite voiceover_text in English.

`;
  }
  return `━━ VOICEOVER LANGUAGE (HIGHEST PRIORITY) ━━
The field "voiceover_text" on EVERY storyboard shot MUST be written in TURKISH ONLY — doğal konuşma Türkçesi.
English category_label_en and comment_tr instructions elsewhere do NOT apply to voiceover_text; voiceover_text stays Turkish.

`;
}

function voiceoverPromptAppend(language: "tr" | "en"): string {
  const langLabel = language === "en" ? "English" : "Turkish";
  const example =
    language === "en"
      ? "Low mileage, clean lines, ready to drive."
      : "Düşük kilometre, temiz hatlar, hazır araç.";
  const antiMix =
    language === "en"
      ? "- Do NOT use Turkish, German, or any non-English text in voiceover_text — even if the car listing data is Turkish."
      : "- Türkçe dışında dil kullanma; İngilizce label'ları voiceover'a kopyalama.";
  return `

TASK VOICEOVER — ${langLabel} narration for Text-to-Speech (ElevenLabs)
For EVERY storyboard shot you MUST include "voiceover_text": the exact spoken script for that shot (same language as above — non-negotiable).
- Language: ${langLabel} ONLY. Do not mix languages.
${antiMix}
- One or two short sentences. Premium dealership / social reel tone.
- The line must be speakable within duration_frames at natural pacing (~2.0–2.5 words per second). Prefer shorter lines.
- Narration is strictly sequential in the final edit: the next shot's voiceover starts only after this shot's time ends — write each line as a standalone beat for that shot only.
- Do not use double-quote characters inside voiceover_text.

OUTPUT: each storyboard object MUST include "voiceover_text" (non-empty string). Example for ${langLabel}:
"voiceover_text": "${example}"`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const aspectRatio: string = body.aspectRatio ?? "16:9";
    const voiceoverEnabled = body.voiceover === true;
    const voiceoverLanguage: "tr" | "en" = body.voiceoverLanguage === "en" ? "en" : "tr";
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

    const photoDimLines = clean.map((p) => {
      if (p.width && p.height) {
        const arFloat = (p.width / p.height).toFixed(2);
        const orient = p.width > p.height ? "landscape" : p.width < p.height ? "portrait" : "square";
        return `  Photo ${p.index}: ${p.width}×${p.height} (AR ${arFloat}, ${orient})`;
      }
      return `  Photo ${p.index}: unknown dimensions`;
    }).join("\n");

    const maxRepeat = Math.max(2, Math.ceil(clean.length / 5));

    const isPortraitFormat = aspectRatio === "9:16" || aspectRatio === "3:4";

    const baseHeader = `You are a premium automotive video storyboard director.

INPUT: ${clean.length} car photos (JPEG, indexed 0-based).
OUTPUT VIDEO FORMAT: ${aspectRatio}
PHOTO DIMENSIONS:
${photoDimLines}

━━━ NON-NEGOTIABLE RULES ━━━
1. Every shot: photo occupies ≤ 55% of screen. The rest = typography + data.
2. "full_bleed", "push_horizontal", "color_wash" are FORBIDDEN.
3. Photos are NEVER cropped — always displayed with objectFit:contain on a dark background.
4. VARIETY IS MANDATORY: No scene_variant may appear more than ${maxRepeat} times total.
   "framed_center" and "listing_panel" may each appear at most ${maxRepeat} times — not more.
5. NO two consecutive shots may use the same scene_variant.
6. Use PHOTO DIMENSIONS to choose the best layout:
   - Photo AR ≈ output AR → "framed_center" or "letter_box"
   - Photo landscape, output portrait → "listing_panel" or "editorial_right"
   - Photo portrait, output landscape → "framed_center" or "card_panel"
   - Photo square → any layout, avoid repeating the same as prior shot
━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT EACH VARIANT DISPLAYS (each one shows a DIFFERENT slice of car data — variety is mandatory):
• "framed_center"   → Marka + Seri + Model + Yıl + Araç Durumu + Fiyat + Motor·KM·Kasa özeti
• "listing_panel"   → KM + Vites + Yakıt + Kasa (pratik kullanım bilgileri)
• "editorial_right" / "editorial_left" → Marka büyük + Motor Gücü + Çekiş + Renk + Fiyat
• "split_specs"     → KM + Motor Gücü + Motor Hacmi + Fiyat (motor odaklı)
• "card_panel"      → Motor Gücü / Motor Hacmi / Çekiş / Yakıt / Vites / KM tablosu
• "side_table"      → Kategori bazlı spec tablosu (tekerlek / kokpit / motor)
• "floating_card"   → İlan Tarihi + Araç Durumu + Garanti + Ağır Hasar Kayıtlı + Plaka + Renk
• "letter_box"      → Sinematik geniş çerçeve + marka barları
• "feature_hero"    → Performans: HP / Nm / 0-100 (CLIMAX)
• "duo_split"       → İki fotoğraf yan yana (KARŞILAŞTIRMA)
• "trio_mosaic"     → 1 büyük + 2 küçük fotoğraf (MONTAJ)
• "split_band"      → Profil görüntüsü + kategori bandı
• "callout"         → Altın nokta + etiket balonu (DETAY)
• "spec_table"      → Animasyonlu overlay tablo

TASK A — For EVERY photo, write a short critique in Turkish (comment_tr).

TASK B — Assign exactly ONE unique category_id per photo:
1) Prefer fixed ids (use each max once): "${fixedList}"
2) Otherwise invent a specific English snake_case id.
3) category_label_en: short English label for display.
`;

    const portraitPrompt = `${baseHeader}

━━━ PORTRAIT-FIRST (MOBILE) DIRECTIVE ━━━
You are producing a premium vertical social video (TikTok/Reels/Shorts).
The edit must feel designed for mobile: big typography, quick comprehension, and strong hook.

PORTRAIT RULES:
1) Prefer layouts that look intentional on vertical screens:
   Priority: "listing_panel", "editorial_right", "editorial_left", "framed_center", "floating_card", "callout", "split_specs", "spec_table".
2) "letter_box" is allowed but must be used at most once and only if the photo is a true landscape hero shot.
3) Use "split_band" only for clean profile/side shots (if present).
4) Avoid multi-image grids unless you have enough distinct angles:
   - "duo_split" use at most once.
   - "trio_mosaic" use at most once and only mid-video.
5) The first 2 shots MUST be highly readable: no dense tables, no tiny labels.

TASK C — Portrait narrative arc (mobile-first, maximum variety):
  SHOT 1: Hook. "editorial_right" or "framed_center". 150–210 frames.
  SHOT 2: "listing_panel" (KM/Vites/Yakıt/Kasa). 150–210 frames.
  SHOT 3: "callout" (detail) OR "floating_card" (meta). 120–180 frames.
  SHOT 4: "split_specs" (motor-focused). 150–210 frames.
  SHOT 5: "editorial_left" (brand identity alternate). 150–210 frames.
  SHOT 6: "spec_table" or "card_panel" (table). 210–300 frames.
  SHOT 7 (optional): "duo_split" OR "trio_mosaic" (mid montage). 180–240 frames.
  SECOND TO LAST: "split_specs" or "spec_table". 180–240 frames.
  LAST: "feature_hero" (performance climax). 210–300 frames.
  For ${clean.length} < 7 photos, skip slots in order but keep the same principle.

TASK D — Duration per shot (portrait):
  - Readable layouts: 150–240 frames
  - Dense tables: 210–330 frames
  - Detail callout: 90–150 frames
  Min 90 frames, max 360 frames.

TASK E — scene_variant rules summary:
  • "callout" → only for close-up details (badge, headlight, wheel center cap)
  • "split_band" → only for clean profile/side shots
  • "duo_split" → use max 1 time; pick complementary photos
  • "trio_mosaic" → use max 1 time; mid-video only
  • "feature_hero" → use exactly 1 time (last shot ideally)
  • Everything else → spread freely, no consecutive duplicates

Also set quality_score (1–10), lighting: "excellent"|"good"|"average"|"poor".

OUTPUT — ONLY valid JSON, no markdown:
{
  "storyboard": [{
    "source_index": 0,
    "category_id": "front",
    "category_label_en": "Front",
    "comment_tr": "Türkçe yorum",
    "quality_score": 8,
    "lighting": "good",
    "duration_frames": 180,
    "scene_variant": "framed_center"
  }],
  "editing_notes_tr": "Kısa Türkçe genel kurgu notu",
  "outro_frames": 90
}

MUST: exactly ${clean.length} entries, each source_index once.
Target ~${clean.length * 180} frames total (~${Math.round(clean.length * 6)} sn).
NO full_bleed · NO push_horizontal · NO color_wash.
NO variant repeated > ${maxRepeat} times · NO two consecutive same variant.`;

    const landscapePrompt = `${baseHeader}

TASK C — Narrative arc with MAXIMUM VARIETY:
  SHOT 1: Hook. "framed_center". 150–180 frames.
  SHOT 2: "listing_panel" (shows KM/Motor/Renk/Vites — completely different data). 150–180 frames.
  SHOT 3: "editorial_right" or "editorial_left" (brand identity). 150–200 frames.
  SHOT 4: "card_panel" or "side_table" (spec table). 180–240 frames.
  SHOT 5: "split_specs" or "split_band". 150–200 frames.
  SHOT 6: "letter_box" (cinematic wide). 180–240 frames.
  SHOT 7: "duo_split" (pair comparison). 180–240 frames.
  SHOT 8: "trio_mosaic" (montage). 180–240 frames.
  SHOT 9+: Rotate freely through all remaining variants, no consecutive repeats.
  SECOND TO LAST: "spec_table" or "split_specs". 180–240 frames.
  LAST: "feature_hero" (performance climax). 210–300 frames.
  For ${clean.length} < 9 photos, skip slots in order but keep the same principle.

TASK D — Duration per shot:
  "framed_center", "listing_panel": 150–210 frames  (~5–7 sn)
  "editorial_right", "editorial_left": 150–210 frames  (~5–7 sn)
  "card_panel", "side_table", "letter_box", "feature_hero": 210–300 frames  (~7–10 sn)
  "duo_split", "trio_mosaic": 180–270 frames  (~6–9 sn)
  "split_specs", "split_band": 120–180 frames  (~4–6 sn)
  "spec_table", "floating_card": 150–210 frames
  "callout": 90–120 frames
  Min 90 frames (3 sn), max 360 frames (12 sn).

TASK E — scene_variant assignment rules summary:
  • "callout" → only for close-up details (badge, headlight, wheel center cap)
  • "split_band" → only for clean profile/side shots
  • "duo_split" → use exactly 1 time; pick adjacent or complementary photos
  • "trio_mosaic" → use exactly 1 time (mid-video)
  • "feature_hero" → use exactly 1 time (last shot ideally)
  • Everything else → spread freely, no consecutive duplicates

Also set quality_score (1–10), lighting: "excellent"|"good"|"average"|"poor".

OUTPUT — ONLY valid JSON, no markdown:
{
  "storyboard": [{
    "source_index": 0,
    "category_id": "front",
    "category_label_en": "Front",
    "comment_tr": "Türkçe yorum",
    "quality_score": 8,
    "lighting": "good",
    "duration_frames": 180,
    "scene_variant": "framed_center"
  }],
  "editing_notes_tr": "Kısa Türkçe genel kurgu notu",
  "outro_frames": 90
}

MUST: exactly ${clean.length} entries, each source_index once.
Target ~${clean.length * 180} frames total (~${Math.round(clean.length * 6)} sn).
NO full_bleed · NO push_horizontal · NO color_wash.
NO variant repeated > ${maxRepeat} times · NO two consecutive same variant.`;

    let promptText = isPortraitFormat ? portraitPrompt : landscapePrompt;
    if (voiceoverEnabled) {
      promptText = voiceoverLanguagePreamble(voiceoverLanguage) + promptText;
      promptText += voiceoverPromptAppend(voiceoverLanguage);
    }

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
