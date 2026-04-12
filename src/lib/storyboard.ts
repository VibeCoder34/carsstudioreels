import {
  isSceneVariant,
  type SceneVariant,
} from "@/lib/photoCategories";
import type { LanguageCode } from "@/lib/languages";

/** API / analyze yanıtı (fotoğraf odaklı kurgu) */
export interface StoryboardShot {
  source_index: number;
  category_id: string;
  /**
   * Kısa kategori etiketi — videoda gösterilir; video dili ile uyumlu olmalı.
   * (JSON: `category_label` veya geriye dönük `category_label_en`.)
   */
  category_label_en: string;
  comment_tr: string;
  quality_score: number;
  lighting: string;
  duration_frames: number;
  scene_variant: string;
  /** TTS ile okunacak sahne metni (analyze isteğinde seslendirme açıksa dolar). */
  voiceover_text?: string;
}

export interface PhotoAnalyzeResult {
  storyboard: StoryboardShot[];
  editing_notes_tr: string;
  outro_frames: number;
}

/** Fotoğraf başına minimum/maksimum süre (çerçeve) */
export const MIN_FRAMES_PER_PHOTO = 90;   // 3.0 sn @ 30fps
export const MAX_FRAMES_PER_PHOTO = 180;  // 6.0 sn @ 30fps

export const MIN_SHOT_FRAMES = MIN_FRAMES_PER_PHOTO;
export const MAX_SHOT_FRAMES = MAX_FRAMES_PER_PHOTO;

/** Layout variantları daha uzun tutulur — metinleri okumak için zaman lazım */
const DATA_VARIANTS = new Set([
  "spec_table", "side_table", "split_specs", "floating_card",
  "card_panel", "letter_box", "feature_hero",
  "duo_split", "trio_mosaic",
  "framed_center", "listing_panel", "editorial_right", "editorial_left",
  "price_reveal", "stats_grid",
]);
const MIN_DATA_FRAMES = 150;  // 5 sn minimum
const MAX_DATA_FRAMES = 360;  // 12 sn maximum

/**
 * Fotoğraf sayısına göre dinamik içerik süresi hedefi.
 * Her fotoğraf 3 saniye (90 çerçeve) alır.
 * 15'ten fazla fotoğraf varsa geçişleri hızlandırmak yerine videoyu uzatırız.
 */
export function calculateDynamicTarget(photoCount: number): number {
  return Math.max(photoCount, 1) * MAX_FRAMES_PER_PHOTO;
}

export type FlowMode = "standard" | "fast_sequence";

export interface FlowRecommendation {
  mode: FlowMode;
  totalContentSeconds: number;
  perPhotoSeconds: number;
  warning?: string;
  suggestion?: string;
}

/**
 * Fotoğraf sayısı ve isteğe bağlı sabit süreye göre akış önerisi döndürür.
 * @param photoCount - Yüklenen fotoğraf sayısı
 * @param fixedTotalSec - Kullanıcının belirlediği sabit süre (sn), opsiyonel
 */
export function getFlowRecommendation(
  photoCount: number,
  fixedTotalSec?: number
): FlowRecommendation {
  const minPerSec = MIN_FRAMES_PER_PHOTO / 30; // 3.0s
  const maxPerSec = MAX_FRAMES_PER_PHOTO / 30; // 6.0s

  if (!fixedTotalSec || fixedTotalSec <= 0) {
    // Serbest mod: her fotoğrafa 5 saniye (metin okunma süresi)
    const totalSec = (photoCount * MIN_DATA_FRAMES) / 30;
    const warning =
      photoCount > 20
        ? `${photoCount} fotoğraf ile içerik süresi ~${totalSec.toFixed(0)} saniye olacak.`
        : undefined;
    return { mode: "standard", totalContentSeconds: totalSec, perPhotoSeconds: maxPerSec, warning };
  }

  const perPhotoSec = fixedTotalSec / photoCount;

  if (perPhotoSec < minPerSec) {
    const maxPhotos = Math.floor(fixedTotalSec / minPerSec);
    const excess = photoCount - maxPhotos;
    return {
      mode: "fast_sequence",
      totalContentSeconds: fixedTotalSec,
      perPhotoSeconds: minPerSec,
      warning: `${photoCount} fotoğraf ${fixedTotalSec}sn'ye sığmıyor (fotoğraf başı ${perPhotoSec.toFixed(1)}sn gerekir, min 1.5sn).`,
      suggestion: `${excess} düşük kaliteli/benzer fotoğrafı çıkarın (maks ${maxPhotos} fotoğraf) ya da hızlı sekans moduna geçin.`,
    };
  }

  return { mode: "standard", totalContentSeconds: fixedTotalSec, perPhotoSeconds: Math.min(perPhotoSec, maxPerSec) };
}

function shotMin(s: StoryboardShot): number {
  return DATA_VARIANTS.has(s.scene_variant) ? MIN_DATA_FRAMES : MIN_SHOT_FRAMES;
}
function shotMax(s: StoryboardShot): number {
  return DATA_VARIANTS.has(s.scene_variant) ? MAX_DATA_FRAMES : MAX_SHOT_FRAMES;
}

const REPAIR_FALLBACK: Record<LanguageCode, { missingComment: string; photoLabel: string }> = {
  tr: {
    missingComment: "AI yanıtı bu fotoğraf için eksikti; otomatik sahne eklendi.",
    photoLabel: "Fotoğraf",
  },
  en: {
    missingComment: "The AI response was missing for this photo; a default scene was added.",
    photoLabel: "Photo",
  },
  es: {
    missingComment: "Faltaba la respuesta de la IA para esta foto; se añadió una escena automática.",
    photoLabel: "Foto",
  },
  fr: {
    missingComment: "Réponse IA manquante pour cette photo ; scène automatique ajoutée.",
    photoLabel: "Photo",
  },
  de: {
    missingComment: "Keine KI-Antwort für dieses Foto; Standardszene wurde ergänzt.",
    photoLabel: "Foto",
  },
  it: {
    missingComment: "Risposta IA assente per questa foto; è stata aggiunta una scena automatica.",
    photoLabel: "Foto",
  },
  ru: {
    missingComment: "Ответ ИИ для этого кадра отсутствует; добавлена сцена по умолчанию.",
    photoLabel: "Кадр",
  },
  pt: {
    missingComment: "Resposta da IA ausente para esta foto; cena padrão adicionada.",
    photoLabel: "Foto",
  },
};

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
 * Her sahnenin süresini min/max sınırlarına kıstırır.
 * Analiz API'sinin atadığı süreyi ASLA aşağı ölçekleme — süre kısıtı yok.
 * Çok kısa sahne varsa min'e çekeriz, çok uzunsa max'a kıstırırız.
 */
export function normalizeStoryboardDurations(shots: StoryboardShot[]): void {
  if (!shots.length) return;
  for (const s of shots) {
    const min = shotMin(s);
    const max = shotMax(s);
    s.duration_frames = Math.min(max, Math.max(min, Math.round(s.duration_frames)));
  }
}

function asShot(s: Record<string, unknown>): StoryboardShot {
  const vo = s.voiceover_text ?? s.voiceoverText;
  return {
    source_index: Number(s.source_index ?? s.sourceIndex ?? 0),
    category_id: String(s.category_id ?? s.categoryId ?? "other"),
    category_label_en: String(
      s.category_label ?? s.category_label_en ?? s.categoryLabelEn ?? "",
    ),
    comment_tr: String(s.comment_tr ?? s.commentTr ?? ""),
    quality_score: Number(s.quality_score ?? s.qualityScore ?? 7),
    lighting: String(s.lighting ?? "good"),
    duration_frames: Number(s.duration_frames ?? s.durationFrames ?? 150),
    scene_variant: String(s.scene_variant ?? s.sceneVariant ?? "full_bleed"),
    voiceover_text: typeof vo === "string" ? vo : undefined,
  };
}

/**
 * Eksik sahne, tekrarlayan veya geçersiz source_index durumunda
 * tam olarak photoCount sahneli, tutarlı bir storyboard üretir.
 */
export function repairStoryboard(
  shots: StoryboardShot[],
  photoCount: number,
  videoLanguage: LanguageCode = "tr",
): StoryboardShot[] {
  const n = photoCount;
  if (n <= 0) return [];

  const fb = REPAIR_FALLBACK[videoLanguage] ?? REPAIR_FALLBACK.tr;

  function fallback(i: number): StoryboardShot {
    return {
      source_index: i,
      category_id: `photo_${i + 1}`,
      category_label_en: `${fb.photoLabel} ${i + 1}`,
      comment_tr: fb.missingComment,
      quality_score: 7,
      lighting: "average",
      duration_frames: MIN_DATA_FRAMES,
      scene_variant: "framed_center",
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

export type NormalizeAnalyzeOptions = {
  /** false ise voiceover alanları silinir (model bazen yine döndürebilir). */
  voiceover?: boolean;
  /** Eksik sahne onarımı ve yedek metinlerin dili */
  videoLanguage?: LanguageCode;
};

export function normalizePhotoAnalyzeResult(
  raw: Record<string, unknown>,
  photoCount: number,
  options?: NormalizeAnalyzeOptions
): PhotoAnalyzeResult {
  const wantVoiceover = options?.voiceover === true;
  const videoLanguage = options?.videoLanguage ?? "tr";
  const rawList = (raw.storyboard ?? []) as Record<string, unknown>[];
  let storyboard: StoryboardShot[] = rawList.map(asShot).map((s) => ({
    ...s,
    scene_variant: coerceSceneVariant(s.scene_variant || "full_bleed") as string,
    duration_frames: Math.max(MIN_SHOT_FRAMES, Math.floor(s.duration_frames || 60)),
    category_id: (s.category_id || "other").replace(/\s+/g, "_").toLowerCase(),
    category_label_en: s.category_label_en || s.category_id,
    comment_tr: s.comment_tr || "",
  }));
  storyboard = repairStoryboard(storyboard, photoCount, videoLanguage);
  dedupeCategoryIds(storyboard);
  normalizeStoryboardDurations(storyboard);
  if (wantVoiceover) {
    storyboard = storyboard.map((s) => ({
      ...s,
      voiceover_text: (s.voiceover_text ?? "").trim(),
    }));
  } else {
    storyboard = storyboard.map((s) => {
      const rest = { ...s };
      delete rest.voiceover_text;
      return rest;
    });
  }
  return {
    storyboard,
    editing_notes_tr: String(raw.editing_notes_tr ?? raw.editingNotes ?? ""),
    outro_frames: Math.min(150, Math.max(60, Math.floor(Number(raw.outro_frames ?? raw.outroFrames ?? 90)))),
  };
}
