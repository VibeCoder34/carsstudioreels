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

import { parseLanguageCode, type LanguageCode } from "@/lib/languages";

function voiceoverLanguagePreamble(language: LanguageCode): string {
  if (language === "en") {
    return `━━ VOICEOVER LANGUAGE (HIGHEST PRIORITY) ━━
The field "voiceover_text" on EVERY storyboard shot MUST be written in ENGLISH ONLY — full sentences, natural spoken English.
TASK A still asks for "comment_tr" in Turkish: that is ONLY for on-screen notes. Do NOT copy Turkish from comment_tr into voiceover_text.
If voiceover_text contains any Turkish words when English is required, the output is INVALID — rewrite voiceover_text in English.

`;
  }
  if (language === "es") {
    return `━━ VOICEOVER LANGUAGE (HIGHEST PRIORITY) ━━
The field "voiceover_text" on EVERY storyboard shot MUST be written in SPANISH ONLY — natural spoken Spanish.
Do NOT mix Turkish or English in voiceover_text.

`;
  }
  if (language === "fr") {
    return `━━ VOICEOVER LANGUAGE (HIGHEST PRIORITY) ━━
The field "voiceover_text" on EVERY storyboard shot MUST be written in FRENCH ONLY — natural spoken French.
Do NOT mix Turkish or English in voiceover_text.

`;
  }
  if (language === "de") {
    return `━━ VOICEOVER LANGUAGE (HIGHEST PRIORITY) ━━
The field "voiceover_text" on EVERY storyboard shot MUST be written in GERMAN ONLY — natural spoken German.
Do NOT mix Turkish or English in voiceover_text.

`;
  }
  if (language === "it") {
    return `━━ VOICEOVER LANGUAGE (HIGHEST PRIORITY) ━━
The field "voiceover_text" on EVERY storyboard shot MUST be written in ITALIAN ONLY — natural spoken Italian.
Do NOT mix Turkish or English in voiceover_text.

`;
  }
  if (language === "ru") {
    return `━━ VOICEOVER LANGUAGE (HIGHEST PRIORITY) ━━
The field "voiceover_text" on EVERY storyboard shot MUST be written in RUSSIAN ONLY — natural spoken Russian.
Do NOT mix Turkish or English in voiceover_text.

`;
  }
  if (language === "pt") {
    return `━━ VOICEOVER LANGUAGE (HIGHEST PRIORITY) ━━
The field "voiceover_text" on EVERY storyboard shot MUST be written in PORTUGUESE ONLY — natural spoken Portuguese.
Do NOT mix Turkish or English in voiceover_text.

`;
  }
  return `━━ VOICEOVER LANGUAGE (HIGHEST PRIORITY) ━━
The field "voiceover_text" on EVERY storyboard shot MUST be written in TURKISH ONLY — doğal konuşma Türkçesi.
English category_label_en and comment_tr instructions elsewhere do NOT apply to voiceover_text; voiceover_text stays Turkish.

`;
}

function voiceoverPromptAppend(language: LanguageCode): string {
  const langLabel =
    language === "en" ? "English"
    : language === "es" ? "Spanish"
    : language === "fr" ? "French"
    : language === "de" ? "German"
    : language === "it" ? "Italian"
    : language === "ru" ? "Russian"
    : language === "pt" ? "Portuguese"
    : "Turkish";
  const example =
    language === "en" ? "Low mileage, clean lines, ready to drive."
    : language === "es" ? "Bajo kilometraje, líneas limpias, listo para salir."
    : language === "fr" ? "Faible kilométrage, lignes nettes, prêt à rouler."
    : language === "de" ? "Wenig Kilometer, klare Linien, sofort startklar."
    : language === "it" ? "Basso chilometraggio, linee pulite, pronta da guidare."
    : language === "ru" ? "Небольшой пробег, чистые линии, готов к дороге."
    : language === "pt" ? "Baixa quilometragem, linhas limpas, pronto para rodar."
    : "Düşük kilometre, temiz hatlar, hazır araç.";
  const antiMix =
    language === "tr"
      ? "- Türkçe dışında dil kullanma; İngilizce label'ları voiceover'a kopyalama."
      : `- Do NOT use Turkish or any non-${langLabel} text in voiceover_text — even if the car listing data is Turkish.`;
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
    const videoLanguage: LanguageCode = parseLanguageCode(body.videoLanguage, "tr");
    const userNotes = String(body.userNotes ?? "").trim().slice(0, 800);
    const voiceoverEnabled = body.voiceover === true;
    const voiceoverLanguage: LanguageCode = parseLanguageCode(body.voiceoverLanguage, "tr");
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

    // ── Shared header ────────────────────────────────────────────────────────
    const baseHeader = `You are a premium automotive video storyboard director.

INPUT: ${clean.length} car photos (JPEG, indexed 0-based).
OUTPUT VIDEO FORMAT: ${aspectRatio}
VIDEO LANGUAGE (for on-screen text): ${videoLanguage}
PHOTO DIMENSIONS:
${photoDimLines}

━━━ NON-NEGOTIABLE RULES ━━━
1. "full_bleed", "push_horizontal", "color_wash" are FORBIDDEN.
2. Photos are NEVER cropped — always displayed with objectFit:contain on a dark background.
3. VARIETY IS MANDATORY: No scene_variant may appear more than ${maxRepeat} times total.
4. NO two consecutive shots may use the same scene_variant.
5. READABILITY: one clear message per shot; avoid dense tables in the first 2 shots; prefer large, short labels.
6. PHOTO-AWARE choices:
   - If the photo is a close-up detail (badge/headlight/wheel/interior button) → prefer "callout".
   - If the photo is a clean side profile → "split_band" is allowed (otherwise avoid it).
   - If the photo is a full-body hero angle → "spotlight" (if allowed by format) makes a strong hook.
━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT EACH VARIANT DISPLAYS:
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
• "price_reveal"    → Sol: büyük altın fiyat + marka + KM/Güç/Vites detayları; Sağ: foto kartı (FİYAT VURGUSU)
• "spotlight"       → Tam ekran spot ışığı: merkez parlak, kenarlar çok koyu, arka planda marka watermark (DRAMATİK GİRİŞ)
• "stats_grid"      → Üstte foto kartı, altta 2×2 istatistik grid: KM / Motor Gücü / Vites / Yakıt

TASK A — For EVERY photo, write a short critique in the VIDEO LANGUAGE above (store it in field "comment_tr").
TASK B — Assign exactly ONE unique category_id per photo:
1) Prefer fixed ids (use each max once): "${fixedList}"
2) Otherwise invent a specific English snake_case id.
3) category_label_en: short English label for display.
`;

    const jsonOutputBlock = `
Also set quality_score (1–10), lighting: "excellent"|"good"|"average"|"poor".

OUTPUT — ONLY valid JSON, no markdown:
{
  "storyboard": [{
    "source_index": 0,
    "category_id": "front",
    "category_label_en": "Front",
    "comment_tr": "short critique in video language",
    "quality_score": 8,
    "lighting": "good",
    "duration_frames": 180,
    "scene_variant": "framed_center"
  }],
  "editing_notes_tr": "Short overall editing note in the VIDEO LANGUAGE above",
  "outro_frames": 90
}

MUST: exactly ${clean.length} entries, each source_index once.
NO full_bleed · NO push_horizontal · NO color_wash.
NO variant repeated > ${maxRepeat} times · NO two consecutive same variant.`;

    // ── 9:16 — TikTok / Instagram Reels / YouTube Shorts ────────────────────
    // Must be VERTICAL-NATIVE (not “landscape video rotated into portrait”).
    // Push the design towards large typography, fewer elements, and fast comprehension.
    const vertical916Prompt = `${baseHeader}

━━━ FORMAT: 9:16 — MOBILE VERTICAL (TikTok / Reels / Shorts) ━━━
You are cutting a premium automotive social reel for phone screens.
Design principle: ONE clear message per shot. Big typography. Low cognitive load.
A viewer scrolling fast must understand the shot in ≤ 0.5 seconds.

CRITICAL: Do NOT “adapt” a 16:9 storyboard into 9:16. This must feel designed for vertical.

VERTICAL-SPECIFIC LAYOUT RULES:
• Use a VERTICAL mix dominated by: "spotlight", "stats_grid", "listing_panel", "price_reveal", "callout".
• ALLOWED (9:16-optimised): "spotlight", "stats_grid", "listing_panel", "price_reveal",
  "callout", "floating_card", "split_specs", "framed_center", "editorial_right", "editorial_left",
  "spec_table", "card_panel", "feature_hero", "split_band".
• FORBIDDEN (tiny/awkward on 9:16): "letter_box", "duo_split", "trio_mosaic".
• "split_band" only if there is a clean side-profile photo.
• "callout" only for macro / close-up detail shots (badge, wheel, headlight).
• First 2 shots MUST be the most readable of the entire video (no dense tables).
• Avoid "spec_table" and "card_panel" until after shot 4 (they read small on phones).
• Alternate visual intensity: BOLD hook ↔ simple data ↔ detail ↔ sales impact.

TASK C — 9:16 Narrative arc (MUST follow this structure):
  SHOT 1  : HOOK — "spotlight" (preferred) OR "framed_center". 105–150 frames.
  SHOT 2  : DATA — "stats_grid". 135–180 frames.
  SHOT 3  : SALES — "price_reveal" OR "listing_panel" (keep it simple). 135–180 frames.
  SHOT 4  : DETAIL — "callout" (only if macro/detail photo exists) OR "floating_card". 90–135 frames.
  SHOT 5  : BRAND — "editorial_right" OR "editorial_left". 135–180 frames.
  SHOT 6  : SPECS — "split_specs" (engine-focused). 120–165 frames.
  LAST    : CLIMAX — "feature_hero". 150–210 frames.
  If there are more photos than slots, insert between SHOT 5–6 using ONLY: "listing_panel", "floating_card", "split_specs", "callout" (if detail), "stats_grid" (max once total).

TASK D — Duration per shot (9:16):
  "spotlight"                  : 90–135 frames
  "framed_center"              : 105–150 frames
  "stats_grid"                 : 135–180 frames
  "callout"                    : 90–120 frames
  "floating_card"              : 105–150 frames
  "listing_panel"              : 120–165 frames
  "editorial_right/left"       : 120–165 frames
  "split_specs"                : 120–165 frames
  "price_reveal"               : 135–180 frames
  "feature_hero"               : 150–210 frames
  Min 90 frames · Max 300 frames.

TASK E — Strict usage limits:
  • "spotlight"    → max 1 time (opener)
  • "callout"      → max 2 times (detail photos only)
  • "price_reveal" → exactly 1 time
  • "feature_hero" → exactly 1 time (last shot)
  • "stats_grid"   → max 1 time (shot 2 ideally)
  • "split_band"   → max 1 time (side-profile only)
  • All others     → spread freely, no two consecutive same variant
  • FORBIDDEN: "letter_box", "duo_split", "trio_mosaic"

Target ~${clean.length * 150} frames total (~${Math.round(clean.length * 5)} sn).
${jsonOutputBlock}`;

    // ── 3:4 — Vertical+ (editorial portrait) ────────────────────────────────
    // Still portrait-native but less extreme than 9:16.
    // Keep an editorial/luxury rhythm; still avoid “landscape storyboard in portrait”.
    const vertical34Prompt = `${baseHeader}

━━━ FORMAT: 3:4 — VERTICAL+ (Editorial Portrait) ━━━
You are cutting a premium automotive editorial video for Instagram portrait or print-style display.
Design principle: editorial luxury feel — clean layout, measured pace, typographic confidence.
Slightly slower than 9:16; allow data panels to breathe.

VERTICAL+ LAYOUT RULES:
• ALLOWED: all variants EXCEPT "letter_box" (bars waste vertical space) and "trio_mosaic" (images too small).
• "duo_split" is allowed max 1 time (columns fit better at 3:4 than 9:16).
• "split_band" only for a clean side-profile shot.
• "callout" only for close-up detail shots.
• First 2 shots: prioritise readability — large text, strong brand statement.

TASK C — 3:4 Narrative arc:
  SHOT 1  : HOOK — "spotlight" OR "framed_center". 135–195 frames.
  SHOT 2  : DATA — "stats_grid" OR "listing_panel". 150–210 frames.
  SHOT 3  : SALES — "price_reveal" (preferred) OR "editorial_right/left". 150–210 frames.
  SHOT 4  : DETAIL — "callout" OR "floating_card". 90–150 frames.
  SHOT 5  : SPECS — "split_specs" OR "card_panel". 150–210 frames.
  SHOT 6  : TABLE — "spec_table" OR "side_table". 180–270 frames.
  SHOT 7  : MONTAGE — "duo_split" (max once) OR "stats_grid" (only if not used yet). 180–240 frames.
  LAST    : CLIMAX — "feature_hero". 180–270 frames.
  For ${clean.length} < 9 photos: skip slots from middle, keep hook + price + climax.
  For ${clean.length} > 9 photos: add "editorial_left", "split_specs", "floating_card" between slots.

TASK D — Duration per shot (3:4):
  "spotlight", "callout"                : 90–150 frames
  "framed_center", "listing_panel"      : 150–210 frames
  "editorial_right/left"                : 150–210 frames
  "stats_grid", "split_specs"           : 150–210 frames
  "spec_table", "card_panel", "side_table" : 180–270 frames
  "duo_split"                           : 180–240 frames
  "floating_card"                       : 120–180 frames
  "price_reveal"                        : 150–210 frames
  "feature_hero"                        : 180–270 frames
  Min 90 frames · Max 300 frames.

TASK E — Strict usage limits:
  • "spotlight"    → max 1 time
  • "duo_split"    → max 1 time
  • "price_reveal" → exactly 1 time (near end)
  • "feature_hero" → exactly 1 time (last)
  • "stats_grid"   → max 1 time
  • "callout"      → max 2 times (detail photos only)
  • FORBIDDEN: "letter_box", "trio_mosaic"

Target ~${clean.length * 180} frames total (~${Math.round(clean.length * 6)} sn).
${jsonOutputBlock}`;

    // ── 16:9 — Widescreen landscape ─────────────────────────────────────────
    const landscape169Prompt = `${baseHeader}

━━━ FORMAT: 16:9 — WIDESCREEN LANDSCAPE (YouTube / Web) ━━━
You are cutting a premium automotive video for widescreen display.
Design principle: cinematic flow — use the full horizontal canvas, let data panels
breathe, build to a dramatic climax. Every layout exploits the wide aspect ratio.

TASK C — 16:9 Narrative arc with MAXIMUM VARIETY:
  SHOT 1  : HOOK — "framed_center". 150–180 frames.
  SHOT 2  : DATA — "listing_panel" (KM/Motor/Renk/Vites). 150–180 frames.
  SHOT 3  : BRAND — "editorial_right" OR "editorial_left". 150–200 frames.
  SHOT 4  : TABLE — "card_panel" OR "side_table". 180–240 frames.
  SHOT 5  : SPECS — "split_specs" OR "split_band". 150–200 frames.
  SHOT 6  : CINEMATIC — "letter_box" (wide hero shot). 180–240 frames.
  SHOT 7  : COMPARE — "duo_split". 180–240 frames.
  SHOT 8  : MONTAGE — "trio_mosaic". 180–240 frames.
  SHOT 9+ : Rotate freely: "price_reveal", "spotlight", "stats_grid", "floating_card", "callout". No consecutive repeats.
  SECOND TO LAST: "spec_table" OR "split_specs" OR "stats_grid". 180–240 frames.
  LAST    : CLIMAX — "feature_hero". 210–300 frames.
  For ${clean.length} < 9 photos: skip slots in order; always keep SHOT 1 + LAST.

TASK D — Duration per shot (16:9):
  "framed_center", "listing_panel"          : 150–210 frames
  "editorial_right", "editorial_left"        : 150–210 frames
  "card_panel", "side_table", "letter_box", "feature_hero" : 210–300 frames
  "duo_split", "trio_mosaic"                 : 180–270 frames
  "split_specs", "split_band"                : 120–180 frames
  "spec_table", "floating_card"              : 150–210 frames
  "price_reveal"                             : 180–240 frames
  "spotlight"                                : 90–150 frames
  "stats_grid"                               : 180–270 frames
  "callout"                                  : 90–120 frames
  Min 90 frames · Max 360 frames.

TASK E — Strict usage limits:
  • "callout"      → only for close-up detail photos
  • "split_band"   → only for clean side-profile shots
  • "duo_split"    → exactly 1 time
  • "trio_mosaic"  → exactly 1 time (mid-video)
  • "feature_hero" → exactly 1 time (last shot)
  • "spotlight"    → max 1 time (dramatic opener or second shot)
  • "price_reveal" → max 1 time (near end)
  • "stats_grid"   → max 1 time (mid-video)

Target ~${clean.length * 180} frames total (~${Math.round(clean.length * 6)} sn).
${jsonOutputBlock}`;

    // ── 4:3 — Classic TV / web ───────────────────────────────────────────────
    const classic43Prompt = `${baseHeader}

━━━ FORMAT: 4:3 — CLASSIC (TV / Facebook / Web) ━━━
You are cutting a premium automotive video for classic 4:3 display (slightly wider than square).
Design principle: clear, structured, TV-broadcast quality — each shot communicates one data story cleanly.
The format is forgiving for both landscape and portrait photos.

TASK C — 4:3 Narrative arc:
  SHOT 1  : HOOK — "framed_center". 150–180 frames.
  SHOT 2  : DATA — "listing_panel". 150–180 frames.
  SHOT 3  : BRAND — "editorial_right" OR "editorial_left". 150–200 frames.
  SHOT 4  : SPECS — "split_specs" OR "stats_grid". 150–210 frames.
  SHOT 5  : TABLE — "card_panel" OR "spec_table". 180–240 frames.
  SHOT 6  : DETAIL — "callout" OR "floating_card". 90–150 frames.
  SHOT 7  : CINEMATIC — "letter_box" (max 1 time; only for a true wide landscape hero shot). 150–210 frames.
  SHOT 8  : MONTAGE — "duo_split" OR "trio_mosaic". 180–240 frames.
  SHOT 9+ : "price_reveal", "spotlight", "side_table", "split_band". No consecutive repeats.
  LAST    : CLIMAX — "feature_hero". 210–300 frames.
  For ${clean.length} < 8 photos: skip middle slots; always keep SHOT 1 + LAST.

TASK D — Duration per shot (4:3):
  "framed_center", "listing_panel"         : 150–210 frames
  "editorial_right", "editorial_left"       : 150–210 frames
  "split_specs", "split_band"               : 120–180 frames
  "card_panel", "spec_table", "side_table" : 180–270 frames
  "stats_grid", "duo_split", "trio_mosaic"  : 180–240 frames
  "letter_box"                              : 150–210 frames
  "floating_card", "callout"               : 90–150 frames
  "price_reveal"                            : 180–240 frames
  "spotlight"                               : 90–150 frames
  "feature_hero"                            : 210–300 frames
  Min 90 frames · Max 300 frames.

TASK E — Strict usage limits:
  • "letter_box"   → max 1 time (wide landscape photos only)
  • "duo_split"    → max 1 time
  • "trio_mosaic"  → max 1 time (mid-video)
  • "feature_hero" → exactly 1 time (last shot)
  • "spotlight"    → max 1 time
  • "price_reveal" → max 1 time (near end)
  • "stats_grid"   → max 1 time
  • "callout"      → close-up detail photos only

Target ~${clean.length * 180} frames total (~${Math.round(clean.length * 6)} sn).
${jsonOutputBlock}`;

    // ── 1:1 — Square (Instagram) ─────────────────────────────────────────────
    const square11Prompt = `${baseHeader}

━━━ FORMAT: 1:1 — SQUARE (Instagram / LinkedIn) ━━━
You are cutting a premium automotive video for square display.
Design principle: perfectly balanced — symmetric layouts, strong centred compositions,
works for both landscape and portrait source photos. Clean and scroll-stopping.

SQUARE LAYOUT RULES:
• Layouts that shine on square: "framed_center", "stats_grid", "callout", "floating_card",
  "editorial_right", "editorial_left", "spec_table", "price_reveal", "feature_hero",
  "spotlight", "listing_panel", "split_specs", "card_panel".
• "letter_box" is FORBIDDEN (adds bars that waste space on square).
• "duo_split" is OK once (side-by-side works at 1:1).
• "trio_mosaic" use max 1 time and only mid-video (images will be small).
• "split_band" only for a clean side-profile shot.
• Prefer centred, balanced compositions over asymmetric editorial layouts.

TASK C — 1:1 Narrative arc:
  SHOT 1  : HOOK — "spotlight" OR "framed_center". 120–180 frames.
  SHOT 2  : DATA — "stats_grid". 150–210 frames.
  SHOT 3  : BRAND — "editorial_right" OR "editorial_left". 150–210 frames.
  SHOT 4  : DETAIL — "callout" OR "floating_card". 90–150 frames.
  SHOT 5  : SPECS — "listing_panel" OR "split_specs". 150–180 frames.
  SHOT 6  : TABLE — "spec_table" OR "card_panel". 180–240 frames.
  SHOT 7  : MONTAGE — "duo_split" OR "trio_mosaic". 180–240 frames.
  SHOT 8  : PRICE — "price_reveal". 150–210 frames.
  LAST    : CLIMAX — "feature_hero". 180–270 frames.
  For ${clean.length} < 9 photos: skip middle slots; keep hook + price + climax.

TASK D — Duration per shot (1:1):
  "spotlight"                           : 90–150 frames
  "framed_center", "listing_panel"      : 150–210 frames
  "stats_grid"                          : 150–210 frames
  "editorial_right/left"                : 150–210 frames
  "callout", "floating_card"            : 90–150 frames
  "split_specs", "split_band"           : 120–180 frames
  "spec_table", "card_panel"            : 180–240 frames
  "duo_split", "trio_mosaic"            : 180–240 frames
  "price_reveal"                        : 150–210 frames
  "feature_hero"                        : 180–270 frames
  Min 90 frames · Max 300 frames.

TASK E — Strict usage limits:
  • "letter_box"   → FORBIDDEN
  • "spotlight"    → max 1 time
  • "duo_split"    → max 1 time
  • "trio_mosaic"  → max 1 time (mid-video only)
  • "price_reveal" → exactly 1 time (near end)
  • "feature_hero" → exactly 1 time (last shot)
  • "stats_grid"   → max 1 time
  • "callout"      → close-up detail photos only, max 2 times

Target ~${clean.length * 175} frames total (~${Math.round(clean.length * 5.8)} sn).
${jsonOutputBlock}`;

    // ── Select prompt by format ──────────────────────────────────────────────
    let promptText: string;
    switch (aspectRatio) {
      case "9:16": promptText = vertical916Prompt; break;
      case "3:4":  promptText = vertical34Prompt;  break;
      case "4:3":  promptText = classic43Prompt;   break;
      case "1:1":  promptText = square11Prompt;    break;
      default:     promptText = landscape169Prompt; break;
    }
    if (userNotes) {
      promptText += `\n\n━━ USER NOTES (HIGH PRIORITY) ━━\n${userNotes}\n`;
    }
    if (voiceoverEnabled) {
      promptText = voiceoverLanguagePreamble(voiceoverLanguage) + promptText;
      promptText += voiceoverPromptAppend(voiceoverLanguage);
      promptText += `\n\nCTA RULE: The LAST storyboard shot's voiceover_text must end with a short call-to-action in the same language (e.g. contact us / DM / call). Keep it one short sentence.`;
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
      throw new Error("AI geçerli JSON döndürmedi: " + rawText.slice(0, 200));
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
