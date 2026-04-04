import {
  isSceneVariant,
  type SceneVariant,
} from "@/lib/photoCategories";

/** API / Claude yanıtı (fotoğraf odaklı kurgu) */
export interface StoryboardShot {
  source_index: number;
  category_id: string;
  category_label_en: string;
  comment_tr: string;
  quality_score: number;
  lighting: string;
  duration_frames: number;
  scene_variant: string;
}

export interface PhotoAnalyzeResult {
  storyboard: StoryboardShot[];
  editing_notes_tr: string;
  outro_frames: number;
}

/** İçerik süresi hedefi (~36 sn @ 30fps); toplam video outro ile ~39 sn olur */
export const TARGET_CONTENT_FRAMES = 1080;
export const MIN_SHOT_FRAMES = 60;   // normal shot minimum — 2 sn
export const MAX_SHOT_FRAMES = 210;

/** Layout variantları daha uzun tutulur — okumak için zaman lazım */
const DATA_VARIANTS = new Set([
  "spec_table", "side_table", "split_specs", "floating_card",
  "card_panel", "letter_box", "feature_hero",
  "duo_split", "trio_mosaic",
]);
const MIN_DATA_FRAMES = 150;  // 5 sn minimum
const MAX_DATA_FRAMES = 300;  // 10 sn maximum

function shotMin(s: StoryboardShot): number {
  return DATA_VARIANTS.has(s.scene_variant) ? MIN_DATA_FRAMES : MIN_SHOT_FRAMES;
}
function shotMax(s: StoryboardShot): number {
  return DATA_VARIANTS.has(s.scene_variant) ? MAX_DATA_FRAMES : MAX_SHOT_FRAMES;
}

function dedupeCategoryIds(shots: StoryboardShot[]): void {
  const seen = new Set<string>();
  for (const s of shots) {
    let id = s.category_id.trim() || "uncategorized";
    const base = id;
    if (seen.has(id)) {
      let n = 2;
      while (seen.has(`${base}_${n}`)) n += 1;
      id = `${base}_${n}`;
    }
    seen.add(id);
    s.category_id = id;
  }
}

function coerceSceneVariant(raw: string): SceneVariant {
  if (isSceneVariant(raw)) return raw;
  return "full_bleed";
}

/**
 * Süreleri oransal ölçekleyerek TARGET_CONTENT_FRAMES'e yakınsatır.
 */
export function normalizeStoryboardDurations(shots: StoryboardShot[]): void {
  if (!shots.length) return;
  const sum = shots.reduce((a, s) => a + Math.max(1, s.duration_frames), 0);
  if (sum <= 0) return;
  const scale = TARGET_CONTENT_FRAMES / sum;
  for (const s of shots) {
    const min = shotMin(s);
    const max = shotMax(s);
    s.duration_frames = Math.round(Math.max(1, s.duration_frames) * scale);
    s.duration_frames = Math.min(max, Math.max(min, s.duration_frames));
  }
  const total = shots.reduce((a, s) => a + s.duration_frames, 0);
  let drift = TARGET_CONTENT_FRAMES - total;
  let i = 0;
  while (drift !== 0 && i < shots.length * 4) {
    const idx = i % shots.length;
    const min = shotMin(shots[idx]);
    const max = shotMax(shots[idx]);
    if (drift > 0 && shots[idx].duration_frames < max) {
      shots[idx].duration_frames += 1;
      drift -= 1;
    } else if (drift < 0 && shots[idx].duration_frames > min) {
      shots[idx].duration_frames -= 1;
      drift += 1;
    }
    i += 1;
  }
}

function asShot(s: Record<string, unknown>): StoryboardShot {
  return {
    source_index: Number(s.source_index ?? s.sourceIndex ?? 0),
    category_id: String(s.category_id ?? s.categoryId ?? "other"),
    category_label_en: String(s.category_label_en ?? s.categoryLabelEn ?? ""),
    comment_tr: String(s.comment_tr ?? s.commentTr ?? ""),
    quality_score: Number(s.quality_score ?? s.qualityScore ?? 7),
    lighting: String(s.lighting ?? "good"),
    duration_frames: Number(s.duration_frames ?? s.durationFrames ?? 60),
    scene_variant: String(s.scene_variant ?? s.sceneVariant ?? "full_bleed"),
  };
}

/**
 * Eksik sahne, tekrarlayan veya geçersiz source_index durumunda
 * tam olarak photoCount sahneli, tutarlı bir storyboard üretir.
 */
export function repairStoryboard(shots: StoryboardShot[], photoCount: number): StoryboardShot[] {
  const n = photoCount;
  if (n <= 0) return [];

  function fallback(i: number): StoryboardShot {
    return {
      source_index: i,
      category_id: `photo_${i + 1}`,
      category_label_en: `Photo ${i + 1}`,
      comment_tr: "AI yanıtı bu fotoğraf için eksikti; otomatik sahne eklendi.",
      quality_score: 7,
      lighting: "average",
      duration_frames: MIN_SHOT_FRAMES,
      scene_variant: "full_bleed",
    };
  }

  const safe: StoryboardShot[] = shots.map((s) => {
    const raw = Number(s.source_index);
    const idx = Number.isFinite(raw)
      ? Math.min(n - 1, Math.max(0, Math.floor(raw)))
      : 0;
    return { ...s, source_index: idx };
  });

  const byIndex = new Map<number, StoryboardShot>();
  for (const s of safe) {
    if (!byIndex.has(s.source_index)) {
      byIndex.set(s.source_index, { ...s });
    }
  }
  for (let i = 0; i < n; i++) {
    if (!byIndex.has(i)) {
      byIndex.set(i, fallback(i));
    }
  }

  const perm: number[] = [];
  const seen = new Set<number>();
  for (const s of safe) {
    const idx = s.source_index;
    if (!seen.has(idx)) {
      perm.push(idx);
      seen.add(idx);
    }
  }
  for (let i = 0; i < n; i++) {
    if (!seen.has(i)) {
      perm.push(i);
      seen.add(i);
    }
  }

  return perm.slice(0, n).map((i) => {
    const shot = byIndex.get(i)!;
    return { ...shot, source_index: i };
  });
}

export function normalizePhotoAnalyzeResult(
  raw: Record<string, unknown>,
  photoCount: number
): PhotoAnalyzeResult {
  const rawList = (raw.storyboard ?? []) as Record<string, unknown>[];
  let storyboard: StoryboardShot[] = rawList.map(asShot).map((s) => ({
    ...s,
    scene_variant: coerceSceneVariant(s.scene_variant || "full_bleed") as string,
    duration_frames: Math.max(MIN_SHOT_FRAMES, Math.floor(s.duration_frames || 60)),
    category_id: (s.category_id || "other").replace(/\s+/g, "_").toLowerCase(),
    category_label_en: s.category_label_en || s.category_id,
    comment_tr: s.comment_tr || "",
  }));
  storyboard = repairStoryboard(storyboard, photoCount);
  dedupeCategoryIds(storyboard);
  normalizeStoryboardDurations(storyboard);
  return {
    storyboard,
    editing_notes_tr: String(raw.editing_notes_tr ?? raw.editingNotes ?? ""),
    outro_frames: Math.min(150, Math.max(60, Math.floor(Number(raw.outro_frames ?? raw.outroFrames ?? 90)))),
  };
}
