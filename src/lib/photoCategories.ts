/**
 * Sabit araç fotoğraf kategorileri (İngilizce id — API / Remotion).
 * UI'da Türkçe etiket kullanılır.
 */
export const FIXED_CATEGORY_IDS = [
  "front",
  "rear",
  "rear_right",
  "rear_left",
  "front_right",
  "front_left",
  "right",
  "left",
  "tire",
  "cockpit",
] as const;

export type FixedCategoryId = (typeof FIXED_CATEGORY_IDS)[number];

/** UI'da gösterim (Türkçe) */
export const CATEGORY_LABEL_TR: Record<FixedCategoryId, string> = {
  front: "Ön",
  rear: "Arka",
  rear_right: "Sağ arka",
  rear_left: "Sol arka",
  front_right: "Sağ ön",
  front_left: "Sol ön",
  right: "Sağ",
  left: "Sol",
  tire: "Lastik",
  cockpit: "Kokpit",
};

export function isFixedCategoryId(id: string): id is FixedCategoryId {
  return (FIXED_CATEGORY_IDS as readonly string[]).includes(id);
}

/** Claude'un dönebileceği sahne varyantları (Remotion animasyon eşlemesi) */
export const SCENE_VARIANTS = [
  "full_bleed",
  "slide_entry_left",
  "slide_entry_right",
  "push_horizontal",
  "color_wash",
  "split_band",
  "ken_zoom_slow",
] as const;

export type SceneVariant = (typeof SCENE_VARIANTS)[number];

export function isSceneVariant(s: string): s is SceneVariant {
  return (SCENE_VARIANTS as readonly string[]).includes(s);
}
