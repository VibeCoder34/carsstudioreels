import type { LanguageCode } from "@/lib/languages";

/**
 * Sabit araç fotoğraf kategorileri (İngilizce id — API / Remotion).
 * Görünen etiket video dili ile `getFixedCategoryLabel` üzerinden seçilir.
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

const CATEGORY_LABEL_EN: Record<FixedCategoryId, string> = {
  front: "Front",
  rear: "Rear",
  rear_right: "Rear right",
  rear_left: "Rear left",
  front_right: "Front right",
  front_left: "Front left",
  right: "Right",
  left: "Left",
  tire: "Wheels",
  cockpit: "Cockpit",
};

const CATEGORY_LABEL_ES: Record<FixedCategoryId, string> = {
  front: "Frontal",
  rear: "Trasera",
  rear_right: "Trasera derecha",
  rear_left: "Trasera izquierda",
  front_right: "Delantera derecha",
  front_left: "Delantera izquierda",
  right: "Lateral derecho",
  left: "Lateral izquierdo",
  tire: "Llantas",
  cockpit: "Interior",
};

const CATEGORY_LABEL_FR: Record<FixedCategoryId, string> = {
  front: "Avant",
  rear: "Arrière",
  rear_right: "Arrière droit",
  rear_left: "Arrière gauche",
  front_right: "Avant droit",
  front_left: "Avant gauche",
  right: "Profil droit",
  left: "Profil gauche",
  tire: "Roues",
  cockpit: "Habitacle",
};

const CATEGORY_LABEL_DE: Record<FixedCategoryId, string> = {
  front: "Front",
  rear: "Heck",
  rear_right: "Hinten rechts",
  rear_left: "Hinten links",
  front_right: "Vorne rechts",
  front_left: "Vorne links",
  right: "Seite rechts",
  left: "Seite links",
  tire: "Räder",
  cockpit: "Cockpit",
};

const CATEGORY_LABEL_IT: Record<FixedCategoryId, string> = {
  front: "Anteriore",
  rear: "Posteriore",
  rear_right: "Post. destro",
  rear_left: "Post. sinistro",
  front_right: "Ant. destro",
  front_left: "Ant. sinistro",
  right: "Lato destro",
  left: "Lato sinistro",
  tire: "Cerchi",
  cockpit: "Abitacolo",
};

const CATEGORY_LABEL_RU: Record<FixedCategoryId, string> = {
  front: "Спереди",
  rear: "Сзади",
  rear_right: "Задняя правая",
  rear_left: "Задняя левая",
  front_right: "Передняя правая",
  front_left: "Передняя левая",
  right: "Правый бок",
  left: "Левый бок",
  tire: "Колёса",
  cockpit: "Салон",
};

const CATEGORY_LABEL_PT: Record<FixedCategoryId, string> = {
  front: "Frontal",
  rear: "Traseira",
  rear_right: "Traseira direita",
  rear_left: "Traseira esquerda",
  front_right: "Dianteira direita",
  front_left: "Dianteira esquerda",
  right: "Lateral direita",
  left: "Lateral esquerda",
  tire: "Rodas",
  cockpit: "Interior",
};

/** Sabit kategori id → görünen kısa etiket (video dili) */
export const CATEGORY_LABEL_BY_LANG: Record<LanguageCode, Record<FixedCategoryId, string>> = {
  tr: CATEGORY_LABEL_TR,
  en: CATEGORY_LABEL_EN,
  es: CATEGORY_LABEL_ES,
  fr: CATEGORY_LABEL_FR,
  de: CATEGORY_LABEL_DE,
  it: CATEGORY_LABEL_IT,
  ru: CATEGORY_LABEL_RU,
  pt: CATEGORY_LABEL_PT,
};

export function getFixedCategoryLabel(lang: LanguageCode, id: FixedCategoryId): string {
  return (CATEGORY_LABEL_BY_LANG[lang] ?? CATEGORY_LABEL_BY_LANG.tr)[id];
}

/** AI etiketi + sabit id — videoda gösterilecek kısa kategori adı (video dili). */
export function resolveShotCategoryLabel(
  lang: LanguageCode,
  categoryId: string,
  aiLabel?: string,
): string {
  const id = categoryId.trim();
  if (isFixedCategoryId(id)) return getFixedCategoryLabel(lang, id);
  const generic: Record<LanguageCode, string> = {
    tr: "Detay",
    en: "Detail",
    es: "Detalle",
    fr: "Détail",
    de: "Detail",
    it: "Dettaglio",
    ru: "Деталь",
    pt: "Detalhe",
  };

  // Non-fixed categories coming from AI can be wrong (e.g. "direksiyon" on a non-steering shot).
  // For consistency, we show a safe generic label instead of guessing.
  return generic[lang] ?? generic.en;
}

export function isFixedCategoryId(id: string): id is FixedCategoryId {
  return (FIXED_CATEGORY_IDS as readonly string[]).includes(id);
}

/** Analiz API'sinin dönebileceği sahne varyantları (Remotion animasyon eşlemesi) */
export const SCENE_VARIANTS = [
  "full_bleed",
  "slide_entry_left",
  "slide_entry_right",
  "push_horizontal",
  "color_wash",
  "split_band",
  "ken_zoom_slow",
  "split_specs",
  "floating_card",
  "callout",
  "spec_table",
  "side_table",
  "card_panel",
  "letter_box",
  "feature_hero",
  "duo_split",
  "trio_mosaic",
  /** Fotoğraf üstte küçük kart (%52), altı geniş içerik (marka/model/yıl/fiyat) */
  "framed_center",
  /** Fotoğraf sağda kart olarak, solda büyük tipografi */
  "editorial_right",
  /** Fotoğraf solda kart olarak, sağda büyük tipografi */
  "editorial_left",
  /** Sol küçük fotoğraf kartı (%42), sağda 4 satır bilgi tablosu */
  "listing_panel",
  /** Sağda foto kartı, solda büyük fiyat + araç bilgisi (dramatic price reveal) */
  "price_reveal",
  /** Tam ekran spot ışığı efekti — merkez parlak, kenarlar karanlık, HUD aktif */
  "spotlight",
  /** Üstte foto kartı, altta 4 istatistik kutusu (KM, güç, vites, yakıt) */
  "stats_grid",
] as const;

export type SceneVariant = (typeof SCENE_VARIANTS)[number];

export function isSceneVariant(s: string): s is SceneVariant {
  return (SCENE_VARIANTS as readonly string[]).includes(s);
}
