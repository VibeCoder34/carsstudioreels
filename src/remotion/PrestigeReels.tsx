import {
  AbsoluteFill,
  Img,
  Video,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";
import type { SceneVariant } from "@/lib/photoCategories";

/* ─── Tipler ─────────────────────────────────────────────── */

export type MediaItem = {
  src: string;
  type: "image" | "video";
  durationFrames?: number;
  /**
   * Video için opsiyonel trim bilgisi.
   * startFrom/endAt değerleri Remotion `Video` props'larına (frame bazlı) map edilir.
   */
  inFrame?: number;
  outFrame?: number;
  /** Claude storyboard — sahne animasyonu */
  sceneVariant?: SceneVariant;
  /** İngilizce kısa etiket (rozet / split band) */
  categoryLabelEn?: string;
};

/* ─── Aspect ratio tipleri ───────────────────────────────── */

export type AspectRatioOption = "16:9" | "9:16" | "1:1" | "4:3" | "3:4";

export const ASPECT_RATIO_DIMENSIONS: Record<AspectRatioOption, { width: number; height: number }> = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "1:1":  { width: 1080, height: 1080 },
  "4:3":  { width: 1440, height: 1080 },
  "3:4":  { width: 1080, height: 1440 },
};

/** Dikey veya kare format: bulanık arka plan tekniği uygulanır */
export function needsBlurBackground(ar: AspectRatioOption): boolean {
  return ar === "9:16" || ar === "3:4" || ar === "1:1";
}

export function aspectRatioToLayout(ar: AspectRatioOption): "portrait" | "landscape" {
  return ar === "9:16" || ar === "3:4" ? "portrait" : "landscape";
}

export type PrestigeReelsProps = {
  mediaItems: MediaItem[];
  carBrand: string;
  carModel: string;
  year: string;
  price: string;
  galleryName: string;
  ctaPhone?: string;
  layout?: "portrait" | "landscape";
  /** Çıktı formatı — layout'tan önce gelir */
  aspectRatio?: AspectRatioOption;
  outroFrames?: number;
  reelStyle?: ReelStyle;
  /** Ekstra araç detayları — çeşitli scene_variant'larda gösterilir */
  km?: string;
  motor?: string;      // eski: genel motor tanımı (opsiyonel, motorGucu/Hacmi önce kullanılır)
  renk?: string;
  vites?: string;
  yakit?: string;
  kasa?: string;
  seri?: string;
  aracDurumu?: string;
  motorGucu?: string;
  motorHacmi?: string;
  cekis?: string;
  garanti?: string;
  agirHasarKayitli?: string;
  plaka?: string;
  ilanTarihi?: string;
};

/* ─── Zamanlama sabitleri ────────────────────────────────── */

export const PHOTO_FRAMES = 90;
export const VIDEO_FRAMES = 150;
export const CROSSFADE_FRAMES = 20;
export const OUTRO_FRAMES = 90;

/* ─── Yardımcı fonksiyonlar ──────────────────────────────── */

export function getItemDuration(item: MediaItem): number {
  if (typeof item.durationFrames === "number") {
    return Math.max(1, Math.floor(item.durationFrames));
  }
  if (item.type === "video") {
    if (typeof item.inFrame === "number" && typeof item.outFrame === "number") {
      return Math.max(1, item.outFrame - item.inFrame);
    }
    return VIDEO_FRAMES;
  }
  return PHOTO_FRAMES;
}

function getOverlapFrames(prev: MediaItem | null, next: MediaItem | null, crossfade = CROSSFADE_FRAMES): number {
  if (!prev || !next) return 0;
  const prevDur = getItemDuration(prev);
  const nextDur = getItemDuration(next);
  const maxSafe = Math.max(0, Math.floor(Math.min(prevDur, nextDur) / 2) - 1);
  return Math.min(crossfade, maxSafe);
}

export function getItemStartFrame(items: MediaItem[], idx: number, crossfade = CROSSFADE_FRAMES): number {
  let start = 0;
  for (let i = 0; i < idx; i++) {
    start += getItemDuration(items[i]) - getOverlapFrames(items[i], items[i + 1] ?? null, crossfade);
  }
  return start;
}

export function getTotalFrames(items: MediaItem[], opts?: { outroFrames?: number; crossfadeFrames?: number }): number {
  if (!items.length) return 30;
  const outroFrames = Math.max(0, opts?.outroFrames ?? OUTRO_FRAMES);
  const crossfade = opts?.crossfadeFrames ?? CROSSFADE_FRAMES;
  let total = getItemDuration(items[0]);
  for (let i = 1; i < items.length; i++) {
    total += getItemDuration(items[i]) - getOverlapFrames(items[i - 1] ?? null, items[i], crossfade);
  }
  return total + outroFrames;
}

/* ─── Ease fonksiyonu (lineer yerine smooth hareket) ─────── */

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/* ─── Ken Burns varyantları ──────────────────────────────── */

const KB_VARIANTS = [
  { fromScale: 1.0,  toScale: 1.10, fromX: 0,   toX: 0,   fromY: 0,   toY: 0   }, // zoom in
  { fromScale: 1.10, toScale: 1.0,  fromX: 0,   toX: 0,   fromY: 0,   toY: 0   }, // zoom out
  { fromScale: 1.06, toScale: 1.06, fromX: -40, toX: 40,  fromY: 0,   toY: 0   }, // pan sağa
  { fromScale: 1.06, toScale: 1.06, fromX: 40,  toX: -40, fromY: 0,   toY: 0   }, // pan sola
  { fromScale: 1.04, toScale: 1.10, fromX: 0,   toX: 0,   fromY: 30,  toY: -30 }, // yukarı + zoom
];

/* ─── Geçiş & çıkış varyant tipleri ─────────────────────── */

type TransitionVariant = "zoom-punch" | "blur-fade" | "slide-left" | "slide-right" | "scale-down";
type ExitVariant = "scale-up" | "slide-exit-left" | "blur-out" | "slide-exit-right" | "fade-only";

/* ─── Stil presetleri ────────────────────────────────────── */

export type ReelStyle = "cinematic" | "dynamic" | "luxury";

export interface StylePreset {
  id: ReelStyle;
  label: string;
  description: string;
  emoji: string;
  colorGrades: string[];
  transitions: TransitionVariant[];
  exits: ExitVariant[];
  crossfadeFrames: number;
  clipSeconds: number;
  grainOpacity: number;
  kbIntensity: number;       // 0–1; video KB etkisini ölçekler
  lightLeakColors: string[]; // "rgba(r,g,b,VAL)" şablonları
  lightLeakIntensity: number;
}

export const STYLE_PRESETS: Record<ReelStyle, StylePreset> = {
  cinematic: {
    id: "cinematic",
    label: "Sinematik",
    description: "Yavaş geçişler · Film rengi · Grain",
    emoji: "🎬",
    colorGrades: [
      "contrast(1.12) saturate(0.60) brightness(0.84) sepia(0.08)",
      "contrast(1.18) saturate(0.55) brightness(0.80) hue-rotate(4deg)",
      "contrast(1.10) saturate(0.65) brightness(0.86)",
      "contrast(1.14) saturate(0.58) brightness(0.82) sepia(0.12)",
      "contrast(1.16) saturate(0.62) brightness(0.83) hue-rotate(-4deg)",
    ],
    transitions: ["blur-fade", "scale-down", "blur-fade", "zoom-punch", "scale-down"],
    exits: ["blur-out", "fade-only", "blur-out", "scale-up", "fade-only"],
    crossfadeFrames: 28,
    clipSeconds: 2.5,
    grainOpacity: 0.09,
    kbIntensity: 0.3,
    lightLeakColors: [
      "rgba(255,230,180,VAL)",
      "rgba(200,210,255,VAL)",
      "rgba(255,255,240,VAL)",
    ],
    lightLeakIntensity: 0.18,
  },

  dynamic: {
    id: "dynamic",
    label: "Dinamik",
    description: "Hızlı kesimler · Canlı renkler · Enerji",
    emoji: "⚡",
    colorGrades: [
      "contrast(1.16) saturate(0.92) brightness(0.90) hue-rotate(-8deg)",
      "contrast(1.20) saturate(1.00) brightness(0.88)",
      "contrast(1.14) saturate(0.96) brightness(0.92) hue-rotate(6deg)",
      "contrast(1.18) saturate(0.88) brightness(0.89)",
      "contrast(1.22) saturate(0.94) brightness(0.87) hue-rotate(-4deg)",
    ],
    transitions: ["zoom-punch", "slide-left", "zoom-punch", "slide-right", "zoom-punch"],
    exits: ["scale-up", "slide-exit-right", "scale-up", "slide-exit-left", "scale-up"],
    crossfadeFrames: 10,
    clipSeconds: 1.4,
    grainOpacity: 0.03,
    kbIntensity: 0.55,
    lightLeakColors: [
      "rgba(255,80,40,VAL)",
      "rgba(255,200,0,VAL)",
      "rgba(255,255,255,VAL)",
      "rgba(255,120,0,VAL)",
    ],
    lightLeakIntensity: 0.34,
  },

  luxury: {
    id: "luxury",
    label: "Lüks",
    description: "Zarif akışlar · Altın ton · Premium",
    emoji: "✨",
    colorGrades: [
      "contrast(1.10) saturate(0.72) brightness(0.88) sepia(0.14) hue-rotate(-6deg)",
      "contrast(1.12) saturate(0.68) brightness(0.86) sepia(0.18)",
      "contrast(1.08) saturate(0.75) brightness(0.90) sepia(0.10)",
      "contrast(1.14) saturate(0.70) brightness(0.87) sepia(0.16)",
      "contrast(1.10) saturate(0.65) brightness(0.88) sepia(0.12) hue-rotate(-4deg)",
    ],
    transitions: ["scale-down", "blur-fade", "slide-left", "scale-down", "slide-right"],
    exits: ["fade-only", "blur-out", "fade-only", "blur-out", "fade-only"],
    crossfadeFrames: 22,
    clipSeconds: 2.2,
    grainOpacity: 0.05,
    kbIntensity: 0.2,
    lightLeakColors: [
      "rgba(255,200,80,VAL)",
      "rgba(255,220,120,VAL)",
      "rgba(240,190,60,VAL)",
    ],
    lightLeakIntensity: 0.22,
  },
};

/* ─── Floating spec card overlay (floating_card varyantı) ── */

function FloatingSpecCard({
  localFrame,
  ilanTarihi,
  aracDurumu,
  garanti,
  agirHasarKayitli,
  plaka,
  renk,
  carBrand,
  carModel,
  year,
  price,
}: {
  localFrame: number;
  ilanTarihi?: string;
  aracDurumu?: string;
  garanti?: string;
  agirHasarKayitli?: string;
  plaka?: string;
  renk?: string;
  carBrand: string;
  carModel: string;
  year: string;
  price: string;
}) {
  const slideX = interpolate(localFrame, [12, 38], [80, 0], { extrapolateRight: "clamp" });
  const cardOpacity = interpolate(localFrame, [12, 38], [0, 1], { extrapolateRight: "clamp" });

  // İlan meta bilgileri — farklı veri noktaları, ticari veri değil
  const rows = (ilanTarihi || aracDurumu || garanti != null || agirHasarKayitli != null)
    ? [
        ilanTarihi        ? { label: "İLAN TARİHİ",       value: ilanTarihi,           highlight: false } : null,
        aracDurumu        ? { label: "ARAÇ DURUMU",        value: aracDurumu,           highlight: false } : null,
        garanti           ? { label: "GARANTİ",            value: garanti,              highlight: false } : null,
        agirHasarKayitli  ? { label: "AĞIR HASAR KAYITLI", value: agirHasarKayitli,     highlight: false } : null,
        plaka             ? { label: "PLAKA / UYRUK",      value: plaka,                highlight: false } : null,
        renk              ? { label: "RENK",               value: renk,                 highlight: false } : null,
      ].filter(Boolean) as { label: string; value: string; highlight: boolean }[]
    : [
        { label: "MARKA", value: carBrand, highlight: false },
        { label: "MODEL", value: carModel, highlight: false },
        { label: "YIL",   value: year,     highlight: false },
        { label: "FİYAT", value: price,    highlight: true  },
      ];

  return (
    <div
      style={{
        position: "absolute",
        right: 52,
        bottom: 130,
        opacity: cardOpacity,
        transform: `translateX(${slideX}px)`,
        background: "rgba(4,4,8,0.76)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(248,201,106,0.22)",
        borderRadius: 20,
        padding: "28px 36px",
        minWidth: 260,
      }}
    >
      {rows.map((row, i) => {
        const rowDelay = 28 + i * 12;
        const rowOpacity = interpolate(localFrame, [rowDelay, rowDelay + 16], [0, 1], { extrapolateRight: "clamp" });
        const rowY = interpolate(localFrame, [rowDelay, rowDelay + 16], [14, 0], { extrapolateRight: "clamp" });
        return (
          <div
            key={row.label}
            style={{
              opacity: rowOpacity,
              transform: `translateY(${rowY}px)`,
              marginBottom: i < rows.length - 1 ? 18 : 0,
            }}
          >
            <div
              style={{
                fontFamily: "sans-serif",
                fontSize: 10,
                letterSpacing: "0.14em",
                color: "rgba(255,255,255,0.36)",
                textTransform: "uppercase",
                marginBottom: 3,
              }}
            >
              {row.label}
            </div>
            <div
              style={{
                fontFamily: "sans-serif",
                fontSize: row.highlight ? 30 : 18,
                fontWeight: row.highlight ? 700 : 500,
                color: row.highlight ? "#f8c96a" : "rgba(255,255,255,0.9)",
                letterSpacing: "0.5px",
                textShadow: row.highlight ? "0 0 24px rgba(248,201,106,0.4)" : "none",
              }}
            >
              {row.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Callout annotation overlay (callout varyantı) ─────── */

function CalloutAnnotation({ localFrame, label }: { localFrame: number; label: string }) {
  const lineW = interpolate(localFrame, [14, 42], [0, 130], { extrapolateRight: "clamp" });
  const bubbleOpacity = interpolate(localFrame, [40, 58], [0, 1], { extrapolateRight: "clamp" });
  const bubbleScale = interpolate(localFrame, [40, 58], [0.72, 1], { extrapolateRight: "clamp" });
  const dotPulse = 0.68 + 0.32 * Math.sin((localFrame / 11) * Math.PI);

  return (
    <div
      style={{
        position: "absolute",
        top: "37%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        display: "flex",
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      {/* Pulsing dot */}
      <div style={{ position: "relative", width: 22, height: 22, flexShrink: 0 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "rgba(248,201,106,0.28)",
            transform: `scale(${dotPulse * 2.2})`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 5,
            borderRadius: "50%",
            background: "#f8c96a",
            boxShadow: "0 0 18px rgba(248,201,106,0.85)",
          }}
        />
      </div>

      {/* Connecting line */}
      <div
        style={{
          width: lineW,
          height: 1.5,
          background: "linear-gradient(to right, #f8c96a, rgba(248,201,106,0.35))",
          flexShrink: 0,
        }}
      />

      {/* Label bubble */}
      <div
        style={{
          opacity: bubbleOpacity,
          transform: `scale(${bubbleScale})`,
          transformOrigin: "left center",
          background: "rgba(4,4,8,0.80)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(248,201,106,0.28)",
          borderRadius: 12,
          padding: "12px 22px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.94)",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

/* ─── Spec table overlay (spec_table varyantı) ──────────── */

type SpecCategory = "engine" | "cockpit" | "wheel" | "dimensions";

interface SpecRow {
  label: string;
  value: string;
  barPct?: number; // 0–1 arası → animasyonlu bar render eder
}

const SPEC_DATA: Record<SpecCategory, { title: string; rows: SpecRow[] }> = {
  engine: {
    title: "MOTOR PERFORMANSI",
    rows: [
      { label: "Motor",        value: "2.0L TwinPower Turbo" },
      { label: "Güç",          value: "190 HP",      barPct: 0.72 },
      { label: "Tork",         value: "400 Nm",      barPct: 0.80 },
      { label: "0–100 km/s",   value: "7.2 sn",      barPct: 0.56 },
      { label: "Azami Hız",    value: "235 km/h",    barPct: 0.78 },
    ],
  },
  cockpit: {
    title: "İÇ MEKAN ÖZELLİKLERİ",
    rows: [
      { label: "Panoramik Cam Tavan",              value: "✓" },
      { label: "Isıtmalı & Havalandırmalı Koltuk", value: "✓" },
      { label: "12.3\" Dijital Gösterge Paneli",   value: "✓" },
      { label: "Harman Kardon Ses Sistemi",         value: "✓" },
      { label: "Ambient Aydınlatma (16 Renk)",      value: "✓" },
      { label: "Kablosuz Şarj",                    value: "✓" },
    ],
  },
  wheel: {
    title: "JANT & FREN SİSTEMİ",
    rows: [
      { label: "Lastik Ölçüsü",   value: "245/45 R19" },
      { label: "Jant",            value: "19\" Çift Kollu" },
      { label: "Ön Fren Çapı",    value: "348 mm",  barPct: 0.82 },
      { label: "Arka Fren Çapı",  value: "300 mm",  barPct: 0.70 },
      { label: "Fren Tipi",       value: "Ventilasyonlu Disk" },
    ],
  },
  dimensions: {
    title: "BOYUTLAR & HACİM",
    rows: [
      { label: "Uzunluk",         value: "4.963 mm", barPct: 0.82 },
      { label: "Genişlik",        value: "1.868 mm", barPct: 0.68 },
      { label: "Yükseklik",       value: "1.467 mm", barPct: 0.55 },
      { label: "Dingil Mesafesi", value: "2.975 mm", barPct: 0.75 },
      { label: "Bagaj Hacmi",     value: "520 L",    barPct: 0.60 },
    ],
  },
};

function detectSpecCategory(categoryLabelEn: string): SpecCategory {
  const l = categoryLabelEn.toLowerCase();
  if (l.includes("engine") || l.includes("motor") || l.includes("hood") || l.includes("bonnet")) return "engine";
  if (l.includes("cockpit") || l.includes("interior") || l.includes("cabin") || l.includes("dashboard") || l.includes("seat") || l.includes("steering")) return "cockpit";
  if (l.includes("tire") || l.includes("wheel") || l.includes("rim") || l.includes("brake") || l.includes("tyre")) return "wheel";
  return "dimensions";
}

function SpecTableOverlay({
  localFrame,
  categoryLabelEn,
}: {
  localFrame: number;
  categoryLabelEn: string;
}) {
  const category = detectSpecCategory(categoryLabelEn);
  const { title, rows } = SPEC_DATA[category];
  const isChecklist = category === "cockpit";

  const panelY = interpolate(localFrame, [0, 24], [280, 0], {
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const panelOpacity = interpolate(localFrame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  const titleOpacity = interpolate(localFrame, [20, 36], [0, 1], { extrapolateRight: "clamp" });
  const titleX     = interpolate(localFrame, [20, 36], [-28, 0], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        left: 0, right: 0, bottom: 0,
        height: "50%",
        opacity: panelOpacity,
        transform: `translateY(${panelY}px)`,
      }}
    >
      {/* Yarı-şeffaf koyu panel + üst fade */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(4,4,8,0.92) 16%, rgba(4,4,8,0.97) 100%)",
        }}
      />

      {/* İçerik */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "22px 96px 36px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Başlık + altın şerit */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateX(${titleX}px)`,
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              width: 3, height: 24,
              background: "#f8c96a",
              borderRadius: 2,
              boxShadow: "0 0 14px rgba(248,201,106,0.65)",
            }}
          />
          <span
            style={{
              fontFamily: "sans-serif",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.20em",
              color: "rgba(255,255,255,0.48)",
              textTransform: "uppercase",
            }}
          >
            {title}
          </span>
        </div>

        {/* Satırlar */}
        <div
          style={{
            display: isChecklist ? "grid" : "flex",
            gridTemplateColumns: isChecklist ? "1fr 1fr 1fr" : undefined,
            flexDirection: isChecklist ? undefined : "column",
            gap: isChecklist ? "12px 40px" : 0,
            flex: 1,
          }}
        >
          {rows.map((row, ri) => {
            const delay = 32 + ri * 10;
            const rowOpacity = interpolate(localFrame, [delay, delay + 18], [0, 1], { extrapolateRight: "clamp" });
            const rowX      = interpolate(localFrame, [delay, delay + 18], [22, 0], { extrapolateRight: "clamp" });

            if (isChecklist) {
              const checkScale = interpolate(localFrame, [delay, delay + 14], [0, 1], { extrapolateRight: "clamp" });
              return (
                <div
                  key={ri}
                  style={{
                    opacity: rowOpacity,
                    transform: `translateX(${rowX}px)`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 18, height: 18,
                      borderRadius: "50%",
                      background: "rgba(248,201,106,0.12)",
                      border: "1.5px solid #f8c96a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transform: `scale(${checkScale})`,
                    }}
                  >
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#f8c96a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span
                    style={{
                      fontFamily: "sans-serif",
                      fontSize: 13,
                      fontWeight: 400,
                      color: "rgba(255,255,255,0.80)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {row.label}
                  </span>
                </div>
              );
            }

            // Tablo satırı (label | bar animasyonu | değer)
            const barWidth =
              row.barPct !== undefined
                ? interpolate(localFrame, [delay + 10, delay + 36], [0, row.barPct * 100], {
                    extrapolateRight: "clamp",
                  })
                : 0;

            return (
              <div
                key={ri}
                style={{
                  opacity: rowOpacity,
                  transform: `translateX(${rowX}px)`,
                  display: "flex",
                  alignItems: "center",
                  paddingTop: 10,
                  paddingBottom: 10,
                  borderBottom: ri < rows.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  gap: 16,
                }}
              >
                {/* Etiket */}
                <span
                  style={{
                    fontFamily: "sans-serif",
                    fontSize: 11,
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.34)",
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    width: 148,
                    flexShrink: 0,
                  }}
                >
                  {row.label}
                </span>

                {/* Animasyonlu bar + değer */}
                {row.barPct !== undefined ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1 }}>
                    <div
                      style={{
                        flex: 1,
                        height: 3,
                        background: "rgba(255,255,255,0.07)",
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${barWidth}%`,
                          background: "linear-gradient(to right, #f8c96a, rgba(248,201,106,0.55))",
                          borderRadius: 2,
                          boxShadow: "0 0 8px rgba(248,201,106,0.38)",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontFamily: "sans-serif",
                        fontSize: 15,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.92)",
                        letterSpacing: "0.04em",
                        minWidth: 130,
                        textAlign: "right",
                      }}
                    >
                      {row.value}
                    </span>
                  </div>
                ) : (
                  <span
                    style={{
                      fontFamily: "sans-serif",
                      fontSize: 15,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.92)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {row.value}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Tek bir medya slaydı ───────────────────────────────── */

function MediaSlide({
  item,
  index,
  items,
  preset,
  carBrand,
  carModel,
  year,
  price,
  aspectRatio,
  km,
  motor,
  renk,
  vites,
  yakit,
  kasa,
  seri,
  aracDurumu,
  motorGucu,
  motorHacmi,
  cekis,
  garanti,
  agirHasarKayitli,
  plaka,
  ilanTarihi,
}: {
  item: MediaItem;
  index: number;
  items: MediaItem[];
  preset: StylePreset;
  carBrand: string;
  carModel: string;
  year: string;
  price: string;
  aspectRatio?: AspectRatioOption;
  km?: string;
  motor?: string;
  renk?: string;
  vites?: string;
  yakit?: string;
  kasa?: string;
  seri?: string;
  aracDurumu?: string;
  motorGucu?: string;
  motorHacmi?: string;
  cekis?: string;
  garanti?: string;
  agirHasarKayitli?: string;
  plaka?: string;
  ilanTarihi?: string;
}) {
  const frame = useCurrentFrame();
  const startFrame = getItemStartFrame(items, index, preset.crossfadeFrames);
  const duration = getItemDuration(item);
  const endFrame = startFrame + duration;
  const localFrame = Math.max(0, frame - startFrame);

  const overlapIn = getOverlapFrames(items[index - 1] ?? null, item, preset.crossfadeFrames);
  const overlapOut = getOverlapFrames(item, items[index + 1] ?? null, preset.crossfadeFrames);

  const opacity = (() => {
    // Remotion interpolate inputRange MUST be strictly increasing.
    // overlapIn/out 0 olunca duplicate range oluşabiliyor, onu burada engelliyoruz.
    if (overlapIn <= 0 && overlapOut <= 0) {
      return frame >= startFrame && frame <= endFrame ? 1 : 0;
    }
    if (overlapIn <= 0) {
      return interpolate(
        frame,
        [startFrame, endFrame - overlapOut, endFrame],
        [1, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
    }
    if (overlapOut <= 0) {
      return interpolate(
        frame,
        [startFrame, startFrame + overlapIn, endFrame],
        [0, 1, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
    }
    return interpolate(
      frame,
      [startFrame, startFrame + overlapIn, endFrame - overlapOut, endFrame],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  })();

  if (opacity === 0) return null;

  const kb = KB_VARIANTS[index % KB_VARIANTS.length];
  const rawProgress = duration > 0 ? Math.max(0, frame - startFrame) / duration : 0;
  const progress = easeInOut(Math.min(1, rawProgress));

  // Video için Ken Burns: preset kbIntensity ile ölçeklenir
  const kbMul = item.type === "video" ? preset.kbIntensity : 1.0;
  const effectiveKb = {
    fromScale: 1.0 + (kb.fromScale - 1.0) * kbMul,
    toScale: 1.0 + (kb.toScale - 1.0) * kbMul,
    fromX: kb.fromX * kbMul,
    toX: kb.toX * kbMul,
    fromY: kb.fromY * kbMul,
    toY: kb.toY * kbMul,
  };

  const sceneVariant: SceneVariant = item.sceneVariant ?? "full_bleed";
  const zoomSlow = sceneVariant === "ken_zoom_slow";
  const progressKb = zoomSlow ? Math.pow(progress, 0.65) : progress;

  const kbScale = effectiveKb.fromScale + (effectiveKb.toScale - effectiveKb.fromScale) * progressKb;
  let kbTx = effectiveKb.fromX + (effectiveKb.toX - effectiveKb.fromX) * progressKb;
  const kbTy = effectiveKb.fromY + (effectiveKb.toY - effectiveKb.fromY) * progressKb;
  if (sceneVariant === "push_horizontal") {
    kbTx *= 1.55;
  }

  // ─── Giriş efekti ─────────────────────────────────────────
  const transition = preset.transitions[index % preset.transitions.length];
  const entryDur = Math.min(22, Math.floor(duration * 0.28));
  const entryP = easeOut(Math.min(1, localFrame / Math.max(1, entryDur)));

  let entryScale = 1.0;
  let entryTx = 0;
  const entryTy = 0;
  let entryBlur = 0;

  if (sceneVariant === "slide_entry_left") {
    entryTx = (1 - entryP) * -78;
  } else if (sceneVariant === "slide_entry_right") {
    entryTx = (1 - entryP) * 78;
  } else if (transition === "zoom-punch") {
    entryScale = 1.06 - 0.06 * entryP;
  } else if (transition === "blur-fade") {
    entryBlur = (1 - entryP) * 14;
  } else if (transition === "slide-left") {
    entryTx = (1 - entryP) * -55;
  } else if (transition === "slide-right") {
    entryTx = (1 - entryP) * 55;
  } else if (transition === "scale-down") {
    entryScale = 0.94 + 0.06 * entryP;
  }

  // ─── Çıkış efekti ─────────────────────────────────────────
  const exitVariant = preset.exits[index % preset.exits.length];
  const exitStart = Math.max(0, duration - overlapOut);
  const exitP = overlapOut > 0
    ? easeInOut(Math.min(1, Math.max(0, localFrame - exitStart) / overlapOut))
    : 0;

  let exitScale = 1.0;
  let exitTx = 0;
  let exitBlur = 0;

  if (exitVariant === "scale-up") {
    exitScale = 1.0 + 0.05 * exitP;
  } else if (exitVariant === "blur-out") {
    exitBlur = exitP * 10;
  } else if (exitVariant === "slide-exit-left") {
    exitTx = exitP * -45;
  } else if (exitVariant === "slide-exit-right") {
    exitTx = exitP * 45;
  }
  // fade-only: sadece opacity, scale/translate değişmez

  const finalScale = kbScale * entryScale * exitScale;
  const finalTx = kbTx + entryTx + exitTx;
  const finalTy = kbTy + entryTy;
  const finalBlur = entryBlur + exitBlur;

  const colorGrade = preset.colorGrades[index % preset.colorGrades.length];
  const blurFilter = finalBlur > 0 ? ` blur(${finalBlur.toFixed(1)}px)` : "";

  const mediaStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: `scale(${finalScale}) translate(${finalTx}px, ${finalTy}px)`,
    transformOrigin: "center center",
    filter: colorGrade + blurFilter,
  };

  const containStyle: React.CSSProperties = {
    position: "absolute", inset: 0,
    width: "100%", height: "100%",
    objectFit: "contain",
    transform: `scale(${finalScale}) translate(${finalTx}px, ${finalTy}px)`,
    transformOrigin: "center center",
    filter: colorGrade + blurFilter,
  };

  const cat = item.categoryLabelEn?.trim();
  const washPulse =
    sceneVariant === "color_wash"
      ? 0.12 + 0.1 * Math.sin((localFrame / Math.max(12, duration * 0.08)) * Math.PI * 2)
      : 0;

  const splitBand =
    sceneVariant === "split_band" && item.type === "image" && Boolean(cat);

  if (splitBand) {
    return (
      <AbsoluteFill style={{ opacity, overflow: "hidden", background: "#060608" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "72%", overflow: "hidden", background: "#0a0a0f" }}>
          <Img src={item.src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", filter: colorGrade + blurFilter, transform: `scale(${finalScale}) translate(${finalTx}px, ${finalTy}px)`, transformOrigin: "center center" }} />
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "28%",
            background: "linear-gradient(to top, #050508 0%, #0f1018 100%)",
            display: "flex",
            alignItems: "center",
            paddingLeft: 56,
            paddingRight: 56,
          }}
        >
          <span
            style={{
              fontFamily: "system-ui, sans-serif",
              fontSize: 26,
              fontWeight: 700,
              color: "rgba(255,255,255,0.95)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            {cat}
          </span>
        </div>
      </AbsoluteFill>
    );
  }

  // ─── split_specs: Sol görsel + sağ spec paneli ────────────
  if (sceneVariant === "split_specs") {
    const specs = [
      { label: "KM",          value: km       || "—",  highlight: false },
      { label: "MOTOR GÜCÜ",  value: motorGucu || motor || "—", highlight: false },
      { label: "MOTOR HACMİ", value: motorHacmi || "—", highlight: false },
      { label: "FİYAT",       value: price,             highlight: true  },
    ];

    return (
      <AbsoluteFill style={{ opacity, overflow: "hidden", background: "#040406" }}>
        {/* Sol: araç görseli */}
        <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "58%", overflow: "hidden", background: "#0a0a0f" }}>
          <Img
            src={item.src}
            style={{
              position: "absolute", inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              transform: `scale(${finalScale}) translate(${finalTx}px, ${finalTy}px)`,
              transformOrigin: "center center",
              filter: colorGrade,
            }}
          />
          {/* Sağa eriyen geçiş */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: 180,
              background: "linear-gradient(to right, transparent, #040406)",
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Sağ: spesifikasyon paneli */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: "44%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 72px",
          }}
        >
          {/* Dekoratif çizgi */}
          {(() => {
            const lineW = interpolate(localFrame, [6, 26], [0, 48], { extrapolateRight: "clamp" });
            return (
              <div
                style={{
                  width: lineW,
                  height: 2,
                  background: "linear-gradient(to right, #f8c96a, rgba(248,201,106,0.15))",
                  marginBottom: 44,
                }}
              />
            );
          })()}

          {specs.map((spec, si) => {
            const delay = 10 + si * 14;
            const rowOpacity = interpolate(localFrame, [delay, delay + 20], [0, 1], { extrapolateRight: "clamp" });
            const rowX = interpolate(localFrame, [delay, delay + 20], [36, 0], { extrapolateRight: "clamp" });
            return (
              <div
                key={spec.label}
                style={{ opacity: rowOpacity, transform: `translateX(${rowX}px)` }}
              >
                <div
                  style={{
                    fontFamily: "sans-serif",
                    fontSize: 11,
                    letterSpacing: "0.16em",
                    color: "rgba(255,255,255,0.32)",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  {spec.label}
                </div>
                <div
                  style={{
                    fontFamily: "sans-serif",
                    fontSize: spec.highlight ? 48 : 30,
                    fontWeight: spec.highlight ? 700 : 600,
                    color: spec.highlight ? "#f8c96a" : "rgba(255,255,255,0.92)",
                    letterSpacing: spec.highlight ? "1px" : "0.5px",
                    textShadow: spec.highlight
                      ? "0 0 32px rgba(248,201,106,0.42)"
                      : "none",
                    lineHeight: 1.1,
                  }}
                >
                  {spec.value}
                </div>
                {si < specs.length - 1 && (
                  <div
                    style={{
                      marginTop: 22,
                      marginBottom: 22,
                      height: 1,
                      background: "rgba(255,255,255,0.07)",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  // ─── side_table: Sol foto + sağ kategori tablosu ─────────
  if (sceneVariant === "side_table") {
    const category = detectSpecCategory(cat ?? "exterior");
    const { title, rows } = SPEC_DATA[category];
    const isChecklist = category === "cockpit";

    const lineW    = interpolate(localFrame, [6, 26], [0, 48], { extrapolateRight: "clamp" });
    const titleOp  = interpolate(localFrame, [22, 38], [0, 1],  { extrapolateRight: "clamp" });
    const titleX   = interpolate(localFrame, [22, 38], [-28, 0], { extrapolateRight: "clamp" });

    return (
      <AbsoluteFill style={{ opacity, overflow: "hidden", background: "#040406" }}>
        {/* Sol: araç görseli */}
        <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "55%", overflow: "hidden", background: "#0a0a0f" }}>
          <Img
            src={item.src}
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%", objectFit: "contain",
              transform: `scale(${finalScale}) translate(${finalTx}px, ${finalTy}px)`,
              transformOrigin: "center center",
              filter: colorGrade,
            }}
          />
          {/* Sağa eriyen geçiş */}
          <div style={{
            position: "absolute", top: 0, right: 0, bottom: 0, width: 170,
            background: "linear-gradient(to right, transparent, #040406)",
            pointerEvents: "none",
          }} />
        </div>

        {/* Sağ: tablo paneli */}
        <div style={{
          position: "absolute", top: 0, right: 0, bottom: 0, width: "47%",
          display: "flex", flexDirection: "column", justifyContent: "center",
          padding: "0 68px",
        }}>
          {/* Dekoratif çizgi + başlık */}
          <div style={{ width: lineW, height: 2, background: "linear-gradient(to right, #f8c96a, rgba(248,201,106,0.12))", marginBottom: 22 }} />
          <div style={{ opacity: titleOp, transform: `translateX(${titleX}px)`, display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
            <div style={{ width: 3, height: 22, background: "#f8c96a", borderRadius: 2, boxShadow: "0 0 14px rgba(248,201,106,0.6)" }} />
            <span style={{ fontFamily: "sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.20em", color: "rgba(255,255,255,0.42)", textTransform: "uppercase" }}>
              {title}
            </span>
          </div>

          {/* Satırlar */}
          {isChecklist ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {rows.map((row, ri) => {
                const delay = 32 + ri * 12;
                const rOp    = interpolate(localFrame, [delay, delay + 18], [0, 1], { extrapolateRight: "clamp" });
                const rX     = interpolate(localFrame, [delay, delay + 18], [28, 0], { extrapolateRight: "clamp" });
                const chkS   = interpolate(localFrame, [delay, delay + 14], [0, 1], { extrapolateRight: "clamp" });
                return (
                  <div key={ri} style={{ opacity: rOp, transform: `translateX(${rX}px)`, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(248,201,106,0.10)", border: "1.5px solid #f8c96a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transform: `scale(${chkS})` }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#f8c96a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span style={{ fontFamily: "sans-serif", fontSize: 14, fontWeight: 400, color: "rgba(255,255,255,0.82)", letterSpacing: "0.01em" }}>
                      {row.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {rows.map((row, ri) => {
                const delay = 32 + ri * 13;
                const rOp  = interpolate(localFrame, [delay, delay + 18], [0, 1], { extrapolateRight: "clamp" });
                const rX   = interpolate(localFrame, [delay, delay + 18], [28, 0], { extrapolateRight: "clamp" });
                const barW = row.barPct !== undefined
                  ? interpolate(localFrame, [delay + 12, delay + 40], [0, row.barPct * 100], { extrapolateRight: "clamp" })
                  : 0;
                return (
                  <div key={ri} style={{
                    opacity: rOp, transform: `translateX(${rX}px)`,
                    paddingTop: 13, paddingBottom: 13,
                    borderBottom: ri < rows.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
                  }}>
                    <div style={{ fontFamily: "sans-serif", fontSize: 10, letterSpacing: "0.14em", color: "rgba(255,255,255,0.30)", textTransform: "uppercase", marginBottom: 8 }}>
                      {row.label}
                    </div>
                    {row.barPct !== undefined ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${barW}%`, background: "linear-gradient(to right, #f8c96a, rgba(248,201,106,0.50))", borderRadius: 2, boxShadow: "0 0 8px rgba(248,201,106,0.36)" }} />
                        </div>
                        <span style={{ fontFamily: "sans-serif", fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,0.92)", minWidth: 110, textAlign: "right" }}>
                          {row.value}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontFamily: "sans-serif", fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,0.92)" }}>
                        {row.value}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AbsoluteFill>
    );
  }

  // ─── card_panel: Yuvarlak köşeli foto kartı + veri paneli ──
  if (sceneVariant === "card_panel") {
    // Gerçek araç verisi varsa önce onu kullan; yoksa SPEC_DATA'ya dön
    const realEngineRows: SpecRow[] | null = (motorGucu || motorHacmi || cekis || yakit)
      ? [
          motorGucu  ? { label: "Motor Gücü",   value: motorGucu  } : null,
          motorHacmi ? { label: "Motor Hacmi",  value: motorHacmi } : null,
          cekis      ? { label: "Çekiş",         value: cekis      } : null,
          yakit      ? { label: "Yakıt",         value: yakit      } : null,
          vites      ? { label: "Vites",         value: vites      } : null,
          km         ? { label: "KM",            value: km,        barPct: undefined } : null,
        ].filter(Boolean) as SpecRow[]
      : null;

    const category = detectSpecCategory(cat ?? "exterior");
    const fallback = SPEC_DATA[category];
    const title = realEngineRows ? "ARAÇ TEKNİK BİLGİLERİ" : fallback.title;
    const rows  = realEngineRows ?? fallback.rows;
    const isChecklist = !realEngineRows && category === "cockpit";

    const cardScale = interpolate(localFrame, [0, 24], [0.95, 1.0], { extrapolateRight: "clamp", easing: easeOut });
    const cardOp    = interpolate(localFrame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
    const lineW     = interpolate(localFrame, [12, 34], [0, 48], { extrapolateRight: "clamp" });
    const titleOp   = interpolate(localFrame, [28, 46], [0, 1], { extrapolateRight: "clamp" });
    const titleX    = interpolate(localFrame, [28, 46], [-24, 0], { extrapolateRight: "clamp" });

    return (
      <AbsoluteFill style={{ opacity, background: "#07070d" }}>
        {/* Arka plan yumuşak glow */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 28% 50%, rgba(8,22,44,0.88) 0%, transparent 64%)", pointerEvents: "none" }} />

        {/* Foto kartı — sol, paddingli, yuvarlak köşe */}
        <div style={{
          position: "absolute",
          top: 56, bottom: 56, left: 56,
          width: "50%",
          borderRadius: 18,
          overflow: "hidden",
          background: "#0a0a0f",
          opacity: cardOp,
          transform: `scale(${cardScale})`,
          transformOrigin: "left center",
          boxShadow: "0 28px 90px rgba(0,0,0,0.72), 0 0 0 1px rgba(255,255,255,0.04)",
        }}>
          <Img src={item.src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", transform: `scale(${kbScale}) translate(${kbTx}px, ${kbTy}px)`, transformOrigin: "center center", filter: colorGrade }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(7,7,13,0.4) 0%, transparent 45%)", pointerEvents: "none" }} />
        </div>

        {/* Veri paneli — sağ */}
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: "55%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 72px 0 44px" }}>
          <div style={{ width: lineW, height: 2, background: "#f8c96a", borderRadius: 1, marginBottom: 24, boxShadow: "0 0 14px rgba(248,201,106,0.55)" }} />
          <div style={{ opacity: titleOp, transform: `translateX(${titleX}px)`, marginBottom: 32 }}>
            <span style={{ fontFamily: "sans-serif", fontSize: 10, letterSpacing: "0.22em", color: "rgba(255,255,255,0.30)", textTransform: "uppercase" }}>{title}</span>
          </div>

          {isChecklist ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {rows.map((row, ri) => {
                const d = 38 + ri * 13;
                const rOp = interpolate(localFrame, [d, d + 18], [0, 1], { extrapolateRight: "clamp" });
                const rX  = interpolate(localFrame, [d, d + 18], [26, 0], { extrapolateRight: "clamp" });
                const ckS = interpolate(localFrame, [d, d + 14], [0, 1], { extrapolateRight: "clamp" });
                return (
                  <div key={ri} style={{ opacity: rOp, transform: `translateX(${rX}px)`, display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(248,201,106,0.08)", border: "1.5px solid rgba(248,201,106,0.65)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transform: `scale(${ckS})` }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5L4 7.5L8.5 2.5" stroke="#f8c96a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <span style={{ fontFamily: "sans-serif", fontSize: 14, fontWeight: 400, color: "rgba(255,255,255,0.80)" }}>{row.label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {rows.map((row, ri) => {
                const d  = 38 + ri * 13;
                const rOp = interpolate(localFrame, [d, d + 18], [0, 1], { extrapolateRight: "clamp" });
                const rX  = interpolate(localFrame, [d, d + 18], [26, 0], { extrapolateRight: "clamp" });
                const bW  = row.barPct !== undefined
                  ? interpolate(localFrame, [d + 14, d + 44], [0, row.barPct * 100], { extrapolateRight: "clamp" })
                  : 0;
                return (
                  <div key={ri} style={{ opacity: rOp, transform: `translateX(${rX}px)`, paddingTop: 12, paddingBottom: 12, borderBottom: ri < rows.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                    <div style={{ fontFamily: "sans-serif", fontSize: 10, letterSpacing: "0.14em", color: "rgba(255,255,255,0.28)", textTransform: "uppercase", marginBottom: 8 }}>{row.label}</div>
                    {row.barPct !== undefined ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${bW}%`, background: "linear-gradient(to right, #f8c96a, rgba(248,201,106,0.48))", borderRadius: 2, boxShadow: "0 0 8px rgba(248,201,106,0.35)" }} />
                        </div>
                        <span style={{ fontFamily: "sans-serif", fontSize: 18, fontWeight: 700, color: "#ffffff", minWidth: 108, textAlign: "right" }}>{row.value}</span>
                      </div>
                    ) : (
                      <span style={{ fontFamily: "sans-serif", fontSize: 18, fontWeight: 700, color: "#ffffff" }}>{row.value}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AbsoluteFill>
    );
  }

  // ─── letter_box: Sinemaskop çerçeve + markalı barlar ──────
  if (sceneVariant === "letter_box") {
    const barEnter = interpolate(localFrame, [0, 24], [72, 0], { extrapolateRight: "clamp", easing: easeOut });
    const barOp    = interpolate(localFrame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

    const bottomStats = [
      { label: "MARKA",  value: carBrand },
      { label: "MODEL",  value: carModel },
      { label: "YIL",    value: year     },
      { label: "FİYAT",  value: price    },
    ];

    return (
      <AbsoluteFill style={{ opacity, background: "#040408" }}>
        {/* Orta: fotoğraf — tam genişlik, %66 yükseklik, köşe yok */}
        <div style={{ position: "absolute", top: "17%", left: 0, right: 0, height: "66%", overflow: "hidden", background: "#040408" }}>
          <Img src={item.src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", transform: `scale(${kbScale}) translate(${kbTx}px, ${kbTy}px)`, transformOrigin: "center center", filter: colorGrade }} />
        </div>

        {/* Üst bar */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "17%",
          background: "#040408",
          opacity: barOp,
          transform: `translateY(${-barEnter}px)`,
          display: "flex", alignItems: "center",
          padding: "0 88px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
          <span style={{ fontFamily: "sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: "0.22em", color: "#f8c96a", textTransform: "uppercase" }}>
            {cat ?? carBrand}
          </span>
          <div style={{ marginLeft: 28, flex: 1, height: 1, background: "linear-gradient(to right, rgba(248,201,106,0.28), transparent)" }} />
          <span style={{ fontFamily: "sans-serif", fontSize: 11, fontWeight: 300, letterSpacing: "0.14em", color: "rgba(255,255,255,0.28)", textTransform: "uppercase" }}>
            {carBrand} · {year}
          </span>
        </div>

        {/* Alt bar: specs */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "17%",
          background: "#040408",
          opacity: barOp,
          transform: `translateY(${barEnter}px)`,
          display: "flex", alignItems: "center",
          padding: "0 88px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}>
          {bottomStats.map((stat, si) => {
            const d  = 24 + si * 10;
            const sOp = interpolate(localFrame, [d, d + 18], [0, 1], { extrapolateRight: "clamp" });
            const sY  = interpolate(localFrame, [d, d + 18], [12, 0], { extrapolateRight: "clamp" });
            return (
              <div key={si} style={{ display: "flex", alignItems: "center" }}>
                {si > 0 && <div style={{ width: 1, height: 26, background: "rgba(255,255,255,0.08)", margin: "0 40px" }} />}
                <div style={{ opacity: sOp, transform: `translateY(${sY}px)` }}>
                  <div style={{ fontFamily: "sans-serif", fontSize: 9, letterSpacing: "0.18em", color: "rgba(255,255,255,0.28)", textTransform: "uppercase", marginBottom: 6 }}>{stat.label}</div>
                  <div style={{ fontFamily: "sans-serif", fontSize: si === 3 ? 22 : 17, fontWeight: si === 3 ? 700 : 500, color: si === 3 ? "#f8c96a" : "rgba(255,255,255,0.88)", letterSpacing: "0.02em" }}>{stat.value}</div>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  // ─── feature_hero: Büyük foto kartı + dev performans rakamları
  if (sceneVariant === "feature_hero") {
    const cardOp = interpolate(localFrame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
    const cardY  = interpolate(localFrame, [0, 28], [30, 0], { extrapolateRight: "clamp", easing: easeOut });

    const perfStats = [
      { value: "190 HP", label: "Motor Gücü" },
      { value: "400 Nm", label: "Tork"       },
      { value: "7.2 sn", label: "0–100 km/s" },
    ];

    return (
      <AbsoluteFill style={{ opacity, background: "#07070d" }}>
        {/* Arka glow */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 36%, rgba(12,24,52,0.92) 0%, transparent 68%)", pointerEvents: "none" }} />

        {/* Büyük foto kartı */}
        <div style={{
          position: "absolute",
          top: 52, left: 80, right: 80,
          height: "60%",
          borderRadius: 20,
          overflow: "hidden",
          background: "#07070d",
          opacity: cardOp,
          transform: `translateY(${cardY}px)`,
          boxShadow: "0 36px 110px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.05)",
        }}>
          <Img src={item.src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", transform: `scale(${kbScale}) translate(${kbTx}px, ${kbTy}px)`, transformOrigin: "center center", filter: colorGrade }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(7,7,13,0.3) 0%, transparent 50%)", pointerEvents: "none" }} />
        </div>

        {/* Alt: 3 büyük performans rakamı */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "34%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {perfStats.map((stat, si) => {
            const d  = 34 + si * 18;
            const sOp = interpolate(localFrame, [d, d + 22], [0, 1], { extrapolateRight: "clamp" });
            const sY  = interpolate(localFrame, [d, d + 22], [24, 0], { extrapolateRight: "clamp", easing: easeOut });
            return (
              <div key={si} style={{ display: "flex", alignItems: "stretch" }}>
                {si > 0 && <div style={{ width: 1, background: "rgba(255,255,255,0.07)", margin: "18px 64px" }} />}
                <div style={{ opacity: sOp, transform: `translateY(${sY}px)`, textAlign: "center", minWidth: 150 }}>
                  <div style={{ fontFamily: "sans-serif", fontSize: 56, fontWeight: 800, color: "#f8c96a", letterSpacing: "-1px", lineHeight: 1, textShadow: "0 0 48px rgba(248,201,106,0.38)" }}>
                    {stat.value}
                  </div>
                  <div style={{ fontFamily: "sans-serif", fontSize: 11, letterSpacing: "0.15em", color: "rgba(255,255,255,0.32)", textTransform: "uppercase", marginTop: 12 }}>
                    {stat.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  // ─── duo_split: İki foto kartı yan yana ──────────────────
  if (sceneVariant === "duo_split") {
    const right = items[index + 1] ?? items[Math.max(0, index - 1)];

    const leftOp  = interpolate(localFrame, [0, 22], [0, 1], { extrapolateRight: "clamp" });
    const leftX   = interpolate(localFrame, [0, 22], [-50, 0], { extrapolateRight: "clamp", easing: easeOut });
    const rightOp = interpolate(localFrame, [12, 34], [0, 1], { extrapolateRight: "clamp" });
    const rightX  = interpolate(localFrame, [12, 34], [50, 0], { extrapolateRight: "clamp", easing: easeOut });
    const divH    = interpolate(localFrame, [22, 42], [0, 100], { extrapolateRight: "clamp" });

    return (
      <AbsoluteFill style={{ opacity, background: "#07070d" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, rgba(10,20,40,0.7) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Sol foto kartı */}
        <div style={{
          position: "absolute",
          top: 48, bottom: 48, left: 48,
          width: "calc(50% - 60px)",
          borderRadius: 16, overflow: "hidden",
          background: "#07070d",
          opacity: leftOp, transform: `translateX(${leftX}px)`,
          boxShadow: "0 22px 70px rgba(0,0,0,0.68)",
        }}>
          <Img src={item.src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", transform: `scale(${kbScale}) translate(${kbTx}px, ${kbTy}px)`, transformOrigin: "center center", filter: colorGrade }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(7,7,13,0.65) 0%, transparent 40%)", pointerEvents: "none" }} />
          {cat && (
            <div style={{ position: "absolute", bottom: 18, left: 20, fontFamily: "sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", color: "rgba(255,255,255,0.65)", textTransform: "uppercase" }}>
              {cat}
            </div>
          )}
        </div>

        {/* Orta ayraç */}
        <div style={{
          position: "absolute", left: "50%", top: "50%",
          transform: "translate(-50%, -50%)",
          width: 1, height: `${divH}%`,
          background: "linear-gradient(to bottom, transparent, rgba(248,201,106,0.35) 25%, rgba(248,201,106,0.35) 75%, transparent)",
        }} />

        {/* Sağ foto kartı */}
        <div style={{
          position: "absolute",
          top: 48, bottom: 48, right: 48,
          width: "calc(50% - 60px)",
          borderRadius: 16, overflow: "hidden",
          background: "#07070d",
          opacity: rightOp, transform: `translateX(${rightX}px)`,
          boxShadow: "0 22px 70px rgba(0,0,0,0.68)",
        }}>
          <Img src={right.src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", filter: colorGrade }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(7,7,13,0.65) 0%, transparent 40%)", pointerEvents: "none" }} />
          {right.categoryLabelEn && (
            <div style={{ position: "absolute", bottom: 18, left: 20, fontFamily: "sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", color: "rgba(255,255,255,0.65)", textTransform: "uppercase" }}>
              {right.categoryLabelEn}
            </div>
          )}
        </div>
      </AbsoluteFill>
    );
  }

  // ─── trio_mosaic: 1 büyük + 2 küçük foto kompozisyonu ────
  if (sceneVariant === "trio_mosaic") {
    const b = items[index + 1] ?? items[Math.max(0, index - 1)];
    const c = items[index + 2] ?? items[Math.max(0, index - 2)] ?? b;

    const mainOp  = interpolate(localFrame, [0, 24], [0, 1], { extrapolateRight: "clamp" });
    const mainS   = interpolate(localFrame, [0, 24], [0.95, 1], { extrapolateRight: "clamp", easing: easeOut });
    const topOp   = interpolate(localFrame, [14, 34], [0, 1], { extrapolateRight: "clamp" });
    const topX    = interpolate(localFrame, [14, 34], [36, 0], { extrapolateRight: "clamp", easing: easeOut });
    const botOp   = interpolate(localFrame, [26, 46], [0, 1], { extrapolateRight: "clamp" });
    const botX    = interpolate(localFrame, [26, 46], [36, 0], { extrapolateRight: "clamp", easing: easeOut });

    // Sağ panel genişliği %37, aralarında 12px gap
    const rightW = "calc(37% - 48px)";
    const rightH = "calc(50% - 54px)"; // (frame - 2*48 - 12) / 2

    return (
      <AbsoluteFill style={{ opacity, background: "#06060c" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 32% 50%, rgba(8,18,38,0.92) 0%, transparent 65%)", pointerEvents: "none" }} />

        {/* Ana büyük foto — sol */}
        <div style={{
          position: "absolute",
          top: 48, bottom: 48, left: 48,
          right: "calc(37% + 12px)",
          borderRadius: 16, overflow: "hidden",
          background: "#06060c",
          opacity: mainOp, transform: `scale(${mainS})`,
          transformOrigin: "left center",
          boxShadow: "0 26px 80px rgba(0,0,0,0.72)",
        }}>
          <Img src={item.src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", transform: `scale(${kbScale}) translate(${kbTx}px, ${kbTy}px)`, transformOrigin: "center center", filter: colorGrade }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(6,6,12,0.5) 0%, transparent 45%)", pointerEvents: "none" }} />
          {cat && (
            <div style={{ position: "absolute", bottom: 20, left: 22, fontFamily: "sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", color: "rgba(255,255,255,0.62)", textTransform: "uppercase" }}>
              {cat}
            </div>
          )}
        </div>

        {/* Sağ üst küçük foto */}
        <div style={{
          position: "absolute",
          top: 48, right: 48,
          width: rightW, height: rightH,
          borderRadius: 14, overflow: "hidden",
          background: "#06060c",
          opacity: topOp, transform: `translateX(${topX}px)`,
          boxShadow: "0 16px 50px rgba(0,0,0,0.62)",
        }}>
          <Img src={b.src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", filter: colorGrade }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(6,6,12,0.55) 0%, transparent 50%)", pointerEvents: "none" }} />
          {b.categoryLabelEn && (
            <div style={{ position: "absolute", bottom: 14, left: 16, fontFamily: "sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", color: "rgba(255,255,255,0.58)", textTransform: "uppercase" }}>
              {b.categoryLabelEn}
            </div>
          )}
        </div>

        {/* Sağ alt küçük foto */}
        <div style={{
          position: "absolute",
          bottom: 48, right: 48,
          width: rightW, height: rightH,
          borderRadius: 14, overflow: "hidden",
          background: "#06060c",
          opacity: botOp, transform: `translateX(${botX}px)`,
          boxShadow: "0 16px 50px rgba(0,0,0,0.62)",
        }}>
          <Img src={c.src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", filter: colorGrade }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(6,6,12,0.55) 0%, transparent 50%)", pointerEvents: "none" }} />
          {c.categoryLabelEn && (
            <div style={{ position: "absolute", bottom: 14, left: 16, fontFamily: "sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", color: "rgba(255,255,255,0.58)", textTransform: "uppercase" }}>
              {c.categoryLabelEn}
            </div>
          )}
        </div>
      </AbsoluteFill>
    );
  }

  // ─── framed_center: Fotoğraf üstte küçük kart, altı geniş içerik ──
  if (sceneVariant === "framed_center") {
    const cardOp  = interpolate(localFrame, [0, 22], [0, 1], { extrapolateRight: "clamp" });
    const cardY   = interpolate(localFrame, [0, 22], [20, 0], { extrapolateRight: "clamp", easing: easeOut });
    const t1Op    = interpolate(localFrame, [16, 32], [0, 1], { extrapolateRight: "clamp" });
    const t2Op    = interpolate(localFrame, [24, 40], [0, 1], { extrapolateRight: "clamp" });
    const t3Op    = interpolate(localFrame, [32, 48], [0, 1], { extrapolateRight: "clamp" });
    const lineW   = interpolate(localFrame, [8, 28], [0, 64], { extrapolateRight: "clamp" });
    const slideX  = interpolate(localFrame, [16, 36], [40, 0], { extrapolateRight: "clamp" });

    return (
      <AbsoluteFill style={{ opacity, background: "#05070d" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 30%, rgba(6,18,44,0.7) 0%, transparent 65%)", pointerEvents: "none" }} />

        {/* ÜST: fotoğraf kartı — ekranın üst %52'si */}
        <div style={{
          position: "absolute",
          top: "4%", left: "8%", right: "8%",
          height: "52%",
          borderRadius: 18,
          overflow: "hidden",
          opacity: cardOp,
          transform: `translateY(${cardY}px)`,
          boxShadow: "0 32px 90px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.05)",
          background: "#05070d",
        }}>
          <Img src={item.src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", filter: colorGrade }} />
          {/* Kategori rozeti */}
          {cat && (
            <div style={{ position: "absolute", top: 16, left: 16, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(248,201,106,0.28)", borderRadius: 8, padding: "5px 14px" }}>
              <span style={{ fontFamily: "sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: "#f8c96a", textTransform: "uppercase" }}>{cat}</span>
            </div>
          )}
        </div>

        {/* ALT: geniş içerik alanı — %44 */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "44%", padding: "20px 64px 32px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          {/* Altın çizgi */}
          <div style={{ width: lineW, height: 2.5, background: "linear-gradient(to right, #f8c96a, rgba(248,201,106,0.2))", borderRadius: 2, marginBottom: 18, boxShadow: "0 0 12px rgba(248,201,106,0.45)" }} />

          {/* Marka + Seri + Model */}
          <div style={{ opacity: t1Op, transform: `translateX(${slideX}px)`, marginBottom: 10 }}>
            <span style={{ fontFamily: "sans-serif", fontSize: 34, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.5px" }}>{carBrand}</span>
            {seri && <span style={{ fontFamily: "sans-serif", fontSize: 20, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginLeft: 10 }}>{seri}</span>}
            <span style={{ fontFamily: "sans-serif", fontSize: 22, fontWeight: 400, color: "rgba(255,255,255,0.65)", marginLeft: 10, letterSpacing: "0px" }}>{carModel}</span>
          </div>

          {/* Yıl + Araç Durumu + Fiyat satırı */}
          <div style={{ opacity: t2Op, transform: `translateX(${slideX * 0.6}px)`, display: "flex", alignItems: "center", gap: 24, marginBottom: 14, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: "sans-serif", fontSize: 9, letterSpacing: "0.22em", color: "rgba(255,255,255,0.30)", textTransform: "uppercase", marginBottom: 4 }}>Model Yılı</div>
              <div style={{ fontFamily: "sans-serif", fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>{year}</div>
            </div>
            {aracDurumu && <>
              <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.10)" }} />
              <div>
                <div style={{ fontFamily: "sans-serif", fontSize: 9, letterSpacing: "0.22em", color: "rgba(255,255,255,0.30)", textTransform: "uppercase", marginBottom: 4 }}>Araç Durumu</div>
                <div style={{ fontFamily: "sans-serif", fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,0.80)" }}>{aracDurumu}</div>
              </div>
            </>}
            <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.10)" }} />
            <div>
              <div style={{ fontFamily: "sans-serif", fontSize: 9, letterSpacing: "0.22em", color: "rgba(255,255,255,0.30)", textTransform: "uppercase", marginBottom: 4 }}>Satış Fiyatı</div>
              <div style={{ fontFamily: "sans-serif", fontSize: 24, fontWeight: 700, color: "#f8c96a", textShadow: "0 0 18px rgba(248,201,106,0.38)" }}>{price}</div>
            </div>
          </div>

          {/* Özet: motorGucu · km · kasa */}
          <div style={{ opacity: t3Op, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 3, height: 14, background: "#f8c96a", borderRadius: 2, flexShrink: 0 }} />
            {(motorGucu || motor || km) ? (
              <span style={{ fontFamily: "sans-serif", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.52)", letterSpacing: "0.04em" }}>
                {[motorGucu || motor, km, kasa].filter(Boolean).join("  ·  ")}
              </span>
            ) : (
              <span style={{ fontFamily: "sans-serif", fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.32)", letterSpacing: "0.08em" }}>Detaylı bilgi için iletişime geçin</span>
            )}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  // ─── listing_panel: Sol küçük foto + sağ zengin bilgi paneli ───
  if (sceneVariant === "listing_panel") {
    const photoOp  = interpolate(localFrame, [0, 22], [0, 1], { extrapolateRight: "clamp" });
    const photoX   = interpolate(localFrame, [0, 22], [-44, 0], { extrapolateRight: "clamp", easing: easeOut });
    const r1Op     = interpolate(localFrame, [12, 28], [0, 1], { extrapolateRight: "clamp" });
    const r2Op     = interpolate(localFrame, [20, 36], [0, 1], { extrapolateRight: "clamp" });
    const r3Op     = interpolate(localFrame, [28, 44], [0, 1], { extrapolateRight: "clamp" });
    const r4Op     = interpolate(localFrame, [36, 52], [0, 1], { extrapolateRight: "clamp" });
    const lineW    = interpolate(localFrame, [6, 26], [0, 56], { extrapolateRight: "clamp" });

    const infoRows = [
      { label: "KM",       value: km || "—",    gold: false, op: r1Op },
      { label: "VİTES",    value: vites || "—", gold: false, op: r2Op },
      { label: "YAKIT",    value: yakit || "—", gold: false, op: r3Op },
      { label: "KASA",     value: kasa || "—",  gold: true,  op: r4Op },
    ];

    return (
      <AbsoluteFill style={{ opacity, background: "#04050a" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(6,18,44,0.5) 0%, transparent 60%)", pointerEvents: "none" }} />

        {/* Sol: fotoğraf kartı */}
        <div style={{
          position: "absolute",
          top: 48, bottom: 48, left: 48,
          width: "42%",
          borderRadius: 18,
          overflow: "hidden",
          opacity: photoOp,
          transform: `translateX(${photoX}px)`,
          boxShadow: "0 28px 80px rgba(0,0,0,0.72), 0 0 0 1px rgba(255,255,255,0.05)",
          background: "#04050a",
        }}>
          <Img src={item.src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", filter: colorGrade }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(4,5,10,0.45) 0%, transparent 50%)", pointerEvents: "none" }} />
          {cat && (
            <div style={{ position: "absolute", bottom: 18, left: 20 }}>
              <span style={{ fontFamily: "sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: "rgba(255,255,255,0.55)", textTransform: "uppercase" }}>{cat}</span>
            </div>
          )}
        </div>

        {/* Sağ: bilgi paneli */}
        <div style={{
          position: "absolute",
          top: 0, right: 0, bottom: 0,
          left: "calc(42% + 80px)",
          display: "flex", flexDirection: "column", justifyContent: "center",
          paddingRight: 72,
        }}>
          <div style={{ width: lineW, height: 2.5, background: "#f8c96a", borderRadius: 2, marginBottom: 28, boxShadow: "0 0 14px rgba(248,201,106,0.5)" }} />

          {infoRows.map((row, ri) => (
            <div key={ri} style={{
              opacity: row.op,
              paddingTop: ri === 0 ? 0 : 18,
              paddingBottom: 18,
              borderBottom: ri < infoRows.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
            }}>
              <div style={{ fontFamily: "sans-serif", fontSize: 10, letterSpacing: "0.20em", color: "rgba(255,255,255,0.28)", textTransform: "uppercase", marginBottom: 6 }}>
                {row.label}
              </div>
              <div style={{
                fontFamily: "sans-serif",
                fontSize: row.gold ? 36 : 26,
                fontWeight: 700,
                color: row.gold ? "#f8c96a" : "rgba(255,255,255,0.92)",
                letterSpacing: row.gold ? "0.5px" : "0.2px",
                textShadow: row.gold ? "0 0 24px rgba(248,201,106,0.38)" : "none",
                lineHeight: 1.1,
              }}>
                {row.value}
              </div>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    );
  }

  // ─── editorial_right: Sağda fotoğraf kartı, solda büyük tipografi ─
  if (sceneVariant === "editorial_right" || sceneVariant === "editorial_left") {
    const isRight = sceneVariant === "editorial_right";
    const photoOp = interpolate(localFrame, [0, 24], [0, 1], { extrapolateRight: "clamp" });
    const photoX  = interpolate(localFrame, [0, 24], [isRight ? 50 : -50, 0], { extrapolateRight: "clamp", easing: easeOut });
    const textOp  = interpolate(localFrame, [18, 38], [0, 1], { extrapolateRight: "clamp" });
    const textY   = interpolate(localFrame, [18, 38], [18, 0], { extrapolateRight: "clamp" });
    const lineW   = interpolate(localFrame, [10, 32], [0, 54], { extrapolateRight: "clamp" });

    const photoStyle = isRight
      ? { top: 48, bottom: 48, right: 48, left: "44%" }
      : { top: 48, bottom: 48, left: 48, right: "44%" };
    const textStyle = isRight
      ? { top: 0, left: 0, bottom: 0, right: "56%", padding: "0 56px 0 64px" }
      : { top: 0, right: 0, bottom: 0, left: "56%", padding: "0 64px 0 56px" };

    return (
      <AbsoluteFill style={{ opacity, background: "#050608" }}>
        {/* Fotoğraf kartı */}
        <div style={{
          position: "absolute",
          ...photoStyle,
          borderRadius: 18,
          overflow: "hidden",
          opacity: photoOp,
          transform: `translateX(${photoX}px)`,
          boxShadow: "0 30px 90px rgba(0,0,0,0.72), 0 0 0 1px rgba(255,255,255,0.05)",
          background: "#050608",
        }}>
          <Img src={item.src} style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%", objectFit: "contain",
            transform: `scale(${kbScale}) translate(${kbTx}px, ${kbTy}px)`,
            transformOrigin: "center center",
            filter: colorGrade,
          }} />
          {/* Alt gradient */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,6,8,0.38) 0%, transparent 40%)", pointerEvents: "none" }} />
        </div>

        {/* Tipografi paneli */}
        <div style={{
          position: "absolute",
          ...textStyle,
          display: "flex", flexDirection: "column", justifyContent: "center",
          opacity: textOp, transform: `translateY(${textY}px)`,
        }}>
          <div style={{ width: lineW, height: 2.5, background: "#f8c96a", borderRadius: 2, marginBottom: 26, boxShadow: "0 0 14px rgba(248,201,106,0.52)" }} />
          <div style={{ fontFamily: "sans-serif", fontSize: 10, letterSpacing: "0.22em", color: "rgba(255,255,255,0.30)", textTransform: "uppercase", marginBottom: 14 }}>
            {cat ?? "Araç Detayı"}
          </div>
          <div style={{ fontFamily: "sans-serif", fontSize: 40, fontWeight: 800, color: "#ffffff", lineHeight: 1.05, letterSpacing: "-0.5px", marginBottom: 6 }}>
            {carBrand}
          </div>
          <div style={{ fontFamily: "sans-serif", fontSize: 26, fontWeight: 400, color: "rgba(255,255,255,0.68)", lineHeight: 1.2, marginBottom: 22, letterSpacing: "0.2px" }}>
            {carModel}
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 22 }} />
          {/* Performans detayları: Motor Gücü, Çekiş, Renk + Fiyat */}
          {[
            { label: "MOTOR GÜCÜ", value: motorGucu || motor || "—",  gold: false },
            { label: "ÇEKİŞ",      value: cekis  || "—",  gold: false },
            { label: "RENK",       value: renk   || "—",  gold: false },
            { label: "FİYAT",      value: price,           gold: true  },
          ].map((d, di) => {
            const dOp = interpolate(localFrame, [18 + di * 10, 38 + di * 10], [0, 1], { extrapolateRight: "clamp" });
            return (
              <div key={d.label} style={{ opacity: dOp, marginBottom: di < 3 ? 14 : 0 }}>
                <div style={{ fontFamily: "sans-serif", fontSize: 9, letterSpacing: "0.22em", color: "rgba(255,255,255,0.28)", textTransform: "uppercase", marginBottom: 4 }}>{d.label}</div>
                <div style={{ fontFamily: "sans-serif", fontSize: d.gold ? 28 : 18, fontWeight: d.gold ? 700 : 600, color: d.gold ? "#f8c96a" : "rgba(255,255,255,0.88)", letterSpacing: d.gold ? "0.5px" : "0.1px", textShadow: d.gold ? "0 0 20px rgba(248,201,106,0.38)" : "none" }}>
                  {d.value}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  const blurBg = aspectRatio ? needsBlurBackground(aspectRatio) : false;
  const showHud =
    item.type === "image" &&
    [
      "full_bleed",
      "slide_entry_left",
      "slide_entry_right",
      "push_horizontal",
      "color_wash",
      "ken_zoom_slow",
    ].includes(sceneVariant);

  return (
    <AbsoluteFill style={{ opacity, overflow: "hidden", background: item.type === "image" ? "#050508" : undefined }}>
      {item.type === "image" ? (
        <>
          {/* Backdrop: blurred cover fill to avoid empty space (esp. portrait) */}
          <Img
            src={item.src}
            style={{
              ...mediaStyle,
              objectFit: "cover",
              filter: `${colorGrade} blur(${blurBg ? 54 : 38}px) brightness(0.52) saturate(1.15)`,
              opacity: 0.92,
              transform: `scale(${finalScale * 1.08}) translate(${finalTx * 0.25}px, ${finalTy * 0.25}px)`,
            }}
          />
          <AbsoluteFill
            style={{
              pointerEvents: "none",
              background:
                "radial-gradient(ellipse at 50% 35%, rgba(248,201,106,0.10) 0%, rgba(6,8,14,0.65) 55%, rgba(3,3,6,0.92) 100%)",
              mixBlendMode: "normal",
            }}
          />

          {/* Foreground: contained hero card */}
          <div
            style={{
              position: "absolute",
              inset: blurBg ? 64 : 56,
              borderRadius: 22,
              overflow: "hidden",
              background: "rgba(3,3,6,0.38)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 28px 90px rgba(0,0,0,0.70)",
            }}
          >
            <Img src={item.src} style={{ ...containStyle, filter: colorGrade + blurFilter }} />
            <AbsoluteFill style={{ background: "linear-gradient(to top, rgba(3,3,6,0.55) 0%, transparent 55%)", pointerEvents: "none" }} />
          </div>
        </>
      ) : (
        <Video
          src={item.src}
          style={mediaStyle}
          startFrom={Math.max(0, (item.inFrame ?? 0) - startFrame)}
          endAt={item.outFrame}
          playbackRate={1.0}
          acceptableTimeShiftInSeconds={0.5}
          muted
        />
      )}

      {showHud && (
        <KineticHud
          localFrame={localFrame}
          categoryLabelEn={cat}
          carBrand={carBrand}
          carModel={carModel}
          year={year}
          price={price}
          km={km}
          vites={vites}
          yakit={yakit}
          kasa={kasa}
          renk={renk}
          cekis={cekis}
          motorGucu={motorGucu}
          motorHacmi={motorHacmi}
          aracDurumu={aracDurumu}
          aspectRatio={aspectRatio}
        />
      )}

      {cat && (
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 44,
            zIndex: 4,
            padding: "10px 18px",
            borderRadius: 12,
            background: "rgba(0,0,0,0.45)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(12px)",
            fontFamily: "system-ui, sans-serif",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.92)",
          }}
        >
          {cat}
        </div>
      )}
      {sceneVariant === "color_wash" && (
        <AbsoluteFill
          style={{
            pointerEvents: "none",
            mixBlendMode: "overlay",
            background: `linear-gradient(115deg, rgba(8,60,90,${washPulse}) 0%, transparent 42%, rgba(90,40,20,${washPulse * 0.85}) 100%)`,
          }}
        />
      )}

      {/* floating_card: glassmorphism spec kart */}
      {sceneVariant === "floating_card" && (
        <FloatingSpecCard
          localFrame={localFrame}
          carBrand={carBrand}
          carModel={carModel}
          year={year}
          price={price}
          ilanTarihi={ilanTarihi}
          aracDurumu={aracDurumu}
          garanti={garanti}
          agirHasarKayitli={agirHasarKayitli}
          plaka={plaka}
          renk={renk}
        />
      )}

      {/* callout: pulsing dot + çizgi + etiket balonu */}
      {sceneVariant === "callout" && cat && (
        <CalloutAnnotation localFrame={localFrame} label={cat} />
      )}

      {/* spec_table: kategori bazlı animasyonlu bilgi tablosu */}
      {sceneVariant === "spec_table" && (
        <SpecTableOverlay
          localFrame={localFrame}
          categoryLabelEn={cat ?? "exterior"}
        />
      )}
    </AbsoluteFill>
  );
}

function KineticHud({
  localFrame,
  categoryLabelEn,
  carBrand,
  carModel,
  year,
  price,
  km,
  vites,
  yakit,
  kasa,
  renk,
  cekis,
  motorGucu,
  motorHacmi,
  aracDurumu,
  aspectRatio,
}: {
  localFrame: number;
  categoryLabelEn?: string;
  carBrand: string;
  carModel: string;
  year: string;
  price: string;
  km?: string;
  vites?: string;
  yakit?: string;
  kasa?: string;
  renk?: string;
  cekis?: string;
  motorGucu?: string;
  motorHacmi?: string;
  aracDurumu?: string;
  aspectRatio?: AspectRatioOption;
}) {
  const portrait = aspectRatio ? needsBlurBackground(aspectRatio) : false;
  const pad = portrait ? 56 : 50;

  const inOp = interpolate(localFrame, [10, 34], [0, 1], { extrapolateRight: "clamp" });
  const rise = interpolate(localFrame, [10, 34], [14, 0], { extrapolateRight: "clamp", easing: easeOut });

  const chips: { k: string; v: string; gold?: boolean }[] = [
    { k: "YIL", v: year },
    aracDurumu ? { k: "DURUM", v: aracDurumu } : null,
    km ? { k: "KM", v: km } : null,
    vites ? { k: "VİTES", v: vites } : null,
    yakit ? { k: "YAKIT", v: yakit } : null,
    kasa ? { k: "KASA", v: kasa } : null,
    motorGucu ? { k: "GÜÇ", v: motorGucu } : null,
    motorHacmi ? { k: "HACİM", v: motorHacmi } : null,
    cekis ? { k: "ÇEKİŞ", v: cekis } : null,
    renk ? { k: "RENK", v: renk } : null,
    { k: "FİYAT", v: price, gold: true },
  ].filter(Boolean).slice(0, portrait ? 7 : 8) as { k: string; v: string; gold?: boolean }[];

  const tickerW = 520 + (chips.length * 160);
  const loopT = (localFrame / 180) % 1;
  const tickerX = interpolate(loopT, [0, 1], [0, -tickerW / 2]);

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: inOp, transform: `translateY(${rise}px)` }}>
      {/* Corner brackets */}
      <div style={{ position: "absolute", top: pad, left: pad, width: 38, height: 38, borderLeft: "2px solid rgba(248,201,106,0.6)", borderTop: "2px solid rgba(248,201,106,0.6)", borderRadius: 6 }} />
      <div style={{ position: "absolute", top: pad, right: pad, width: 38, height: 38, borderRight: "2px solid rgba(248,201,106,0.35)", borderTop: "2px solid rgba(248,201,106,0.35)", borderRadius: 6 }} />
      <div style={{ position: "absolute", bottom: pad, left: pad, width: 38, height: 38, borderLeft: "2px solid rgba(248,201,106,0.35)", borderBottom: "2px solid rgba(248,201,106,0.35)", borderRadius: 6 }} />
      <div style={{ position: "absolute", bottom: pad, right: pad, width: 38, height: 38, borderRight: "2px solid rgba(248,201,106,0.6)", borderBottom: "2px solid rgba(248,201,106,0.6)", borderRadius: 6 }} />

      {/* Top identity */}
      <div style={{ position: "absolute", top: pad + 10, left: pad + 14, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {categoryLabelEn && (
            <div style={{ padding: "8px 12px", borderRadius: 12, background: "rgba(0,0,0,0.42)", border: "1px solid rgba(248,201,106,0.22)", backdropFilter: "blur(12px)" }}>
              <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", color: "#f8c96a", textTransform: "uppercase" }}>
                {categoryLabelEn}
              </span>
            </div>
          )}
          <div style={{ height: 1, width: portrait ? 96 : 140, background: "linear-gradient(to right, rgba(248,201,106,0.7), transparent)" }} />
        </div>

        <div style={{ fontFamily: "sans-serif", fontSize: portrait ? 34 : 38, fontWeight: 900, color: "rgba(255,255,255,0.95)", letterSpacing: "-0.6px", textShadow: "0 18px 60px rgba(0,0,0,0.45)" }}>
          {carBrand}
        </div>
        <div style={{ fontFamily: "sans-serif", fontSize: portrait ? 20 : 22, fontWeight: 500, color: "rgba(255,255,255,0.70)", letterSpacing: "0.2px" }}>
          {carModel}
        </div>
      </div>

      {/* Bottom rolling specs rail */}
      <div
        style={{
          position: "absolute",
          left: pad,
          right: pad,
          bottom: pad - 6,
          height: portrait ? 88 : 82,
          borderRadius: 18,
          overflow: "hidden",
          background: "rgba(0,0,0,0.30)",
          border: "1px solid rgba(255,255,255,0.10)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(248,201,106,0.12) 0%, transparent 45%, rgba(248,201,106,0.10) 100%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 12, transform: `translateX(${tickerX}px)` }}>
            {[...chips, ...chips].map((c, i) => (
              <div
                key={`${c.k}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  padding: portrait ? "12px 16px" : "11px 16px",
                  marginLeft: i === 0 ? 10 : 0,
                  borderRadius: 16,
                  background: c.gold ? "rgba(248,201,106,0.12)" : "rgba(255,255,255,0.06)",
                  border: c.gold ? "1px solid rgba(248,201,106,0.30)" : "1px solid rgba(255,255,255,0.10)",
                  minWidth: c.gold ? 220 : 180,
                }}
              >
                <div style={{ fontFamily: "sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>
                  {c.k}
                </div>
                <div style={{ fontFamily: "sans-serif", fontSize: c.gold ? (portrait ? 22 : 20) : 16, fontWeight: c.gold ? 800 : 700, color: c.gold ? "#f8c96a" : "rgba(255,255,255,0.92)", letterSpacing: "0.3px", textShadow: c.gold ? "0 0 18px rgba(248,201,106,0.35)" : "none" }}>
                  {c.v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ─── Geçişlerde light leak ──────────────────────────────── */

function LightLeak({ items, preset }: { items: MediaItem[]; preset: StylePreset }) {
  const frame = useCurrentFrame();

  for (let i = 0; i < items.length - 1; i++) {
    const nextStart = getItemStartFrame(items, i + 1, preset.crossfadeFrames);
    const halfLeak = 10;
    const local = frame - (nextStart - halfLeak);

    if (local >= 0 && local <= halfLeak * 2) {
      const t = local / (halfLeak * 2);
      const peakT = t < 0.5 ? t * 2 : (1 - t) * 2;
      const alpha = easeOut(peakT) * preset.lightLeakIntensity;

      const colorTemplate = preset.lightLeakColors[i % preset.lightLeakColors.length];
      const color = colorTemplate.replace("VAL", String(alpha));
      const gradDir = i % 2 === 0 ? "to bottom right" : "to bottom left";

      return (
        <AbsoluteFill
          style={{
            background: `linear-gradient(${gradDir}, ${color}, transparent 60%)`,
            pointerEvents: "none",
            mixBlendMode: "screen",
          }}
        />
      );
    }
  }

  return null;
}

/* ─── Film grain overlay ─────────────────────────────────── */

function FilmGrain({ opacity }: { opacity: number }) {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2);

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <filter id={`grain-${seed}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.72"
            numOctaves="4"
            seed={seed}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
      </svg>
    </AbsoluteFill>
  );
}

/* ─── Slayt ilerleme göstergesi (sağ taraf, dikey) ─────── */

function ProgressDots({
  items,
  totalFrames,
  outroFrames,
  crossfadeFrames,
}: {
  items: MediaItem[];
  totalFrames: number;
  outroFrames: number;
  crossfadeFrames: number;
}) {
  const frame = useCurrentFrame();
  const outroStart = totalFrames - outroFrames;

  // Outro'da gizle
  const dotsOpacity = interpolate(
    frame,
    outroFrames > 0 ? [outroStart - 20, outroStart] : [0, 1],
    outroFrames > 0 ? [1, 0] : [1, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  if (items.length <= 1) return null;

  // Hangi slayt aktif?
  let activeIndex = 0;
  for (let i = items.length - 1; i >= 0; i--) {
    if (frame >= getItemStartFrame(items, i, crossfadeFrames)) {
      activeIndex = i;
      break;
    }
  }

  // İlk 20 frame'de fade in
  const fadeIn = interpolate(frame, [8, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        right: 52,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        opacity: dotsOpacity * fadeIn,
        pointerEvents: "none",
      }}
    >
      {items.map((_, i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: i === activeIndex ? 32 : 6,
            borderRadius: 3,
            background:
              i === activeIndex
                ? "#ffffff"
                : "rgba(255,255,255,0.32)",
            boxShadow:
              i === activeIndex
                ? "0 0 10px rgba(255,255,255,0.6)"
                : "none",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Vignette ───────────────────────────────────────────── */

function Vignette() {
  return (
    <>
      {/* Radyal vignette — kenarları karartır */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 35%, transparent 35%, rgba(0,0,0,0.75) 100%)",
          pointerEvents: "none",
        }}
      />
      {/* Alt gradient — metin okunurluğu için */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 28%, transparent 55%)",
          pointerEvents: "none",
        }}
      />
    </>
  );
}

/* ─── Üst gradient (badge için) ─────────────────────────── */

function TopGradient() {
  return (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 24%)",
        pointerEvents: "none",
      }}
    />
  );
}

/* ─── Alt metin bloğu ────────────────────────────────────── */

function TextBlock({
  carBrand,
  carModel,
  year,
  price,
  layout,
}: {
  carBrand: string;
  carModel: string;
  year: string;
  price: string;
  layout: "portrait" | "landscape";
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isLandscape = layout === "landscape";

  // Center-out separator çizgisi
  const lineHalf = interpolate(frame, [10, 32], [0, 52], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });

  // Marka adı: aşağıdan yukarı + fade
  const brandY = interpolate(frame, [20, 46], [50, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const brandOpacity = interpolate(frame, [20, 46], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Model
  const modelY = interpolate(frame, [34, 58], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const modelOpacity = interpolate(frame, [34, 58], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fiyat: spring ile çıkış
  const priceScale = spring({
    frame: Math.max(0, frame - 58),
    fps,
    from: 0.82,
    to: 1,
    config: { damping: 16, mass: 0.5 },
  });
  const priceOpacity = interpolate(frame, [58, 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: isLandscape ? "0 96px 68px" : "0 72px 96px",
      }}
    >
      {/* Center-out dekoratif çizgi */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-start",
          marginBottom: 28,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${lineHalf * 2}px`,
            height: "1.5px",
            background:
              "linear-gradient(to right, transparent, rgba(255,255,255,0.85) 40%, rgba(255,255,255,0.85) 60%, transparent)",
          }}
        />
      </div>

      {/* Araç markası */}
      <div
        style={{
          fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
          fontWeight: 700,
          fontSize: isLandscape ? 72 : 96,
          color: "#ffffff",
          letterSpacing: "6px",
          textTransform: "uppercase",
          lineHeight: 0.95,
          opacity: brandOpacity,
          transform: `translateY(${brandY}px)`,
          textShadow: "0 4px 40px rgba(0,0,0,0.7)",
        }}
      >
        {carBrand}
      </div>

      {/* Model */}
      <div
        style={{
          fontFamily: "sans-serif",
          fontWeight: 300,
          fontSize: isLandscape ? 30 : 38,
          color: "rgba(255,255,255,0.72)",
          letterSpacing: "3px",
          marginTop: 14,
          opacity: modelOpacity,
          transform: `translateY(${modelY}px)`,
          textShadow: "0 2px 20px rgba(0,0,0,0.6)",
          textTransform: "uppercase",
        }}
      >
        {carModel}
      </div>

      {/* Yıl + Fiyat */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          marginTop: 28,
          opacity: priceOpacity,
          transform: `scale(${priceScale})`,
          transformOrigin: "left center",
        }}
      >
        <span
          style={{
            fontFamily: "sans-serif",
            fontWeight: 300,
            fontSize: isLandscape ? 24 : 30,
            color: "rgba(255,255,255,0.45)",
            letterSpacing: "3px",
          }}
        >
          {year}
        </span>
        <div
          style={{
            width: "1px",
            height: "28px",
            background: "rgba(255,255,255,0.22)",
          }}
        />
        <span
          style={{
            fontFamily: "sans-serif",
            fontWeight: 700,
            fontSize: isLandscape ? 44 : 52,
            color: "#f8c96a",
            letterSpacing: "1px",
            textShadow: "0 0 36px rgba(248,201,106,0.5), 0 2px 12px rgba(0,0,0,0.4)",
          }}
        >
          {price}
        </span>
      </div>
    </div>
  );
}

/* ─── Sağ üst galeri rozeti ──────────────────────────────── */

function GalleryBadge({ name, layout }: { name: string; layout: "portrait" | "landscape" }) {
  const frame = useCurrentFrame();
  const isLandscape = layout === "landscape";

  const slideX = interpolate(frame, [14, 38], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const opacity = interpolate(frame, [14, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: isLandscape ? 44 : 68,
        right: isLandscape ? 44 : 68,
        opacity,
        transform: `translateX(${slideX}px)`,
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "rgba(0,0,0,0.42)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 20,
        padding: "14px 26px",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "linear-gradient(135deg, #f97316, #ef4444)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M18 3a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h12zm-1 5H7v2h10V8zm0 4H7v2h10v-2z" />
        </svg>
      </div>
      <span
        style={{
          fontFamily: "sans-serif",
          fontWeight: 700,
          fontSize: isLandscape ? 26 : 30,
          color: "#ffffff",
          letterSpacing: "0.5px",
        }}
      >
        {name}
      </span>
    </div>
  );
}

/* ─── Outro / CTA ekranı — glassmorphic kart ─────────────── */

function OutroFrame({
  carBrand,
  carModel,
  price,
  galleryName,
  ctaPhone,
  outroStartFrame,
  layout,
}: {
  carBrand: string;
  carModel: string;
  price: string;
  galleryName: string;
  ctaPhone?: string;
  outroStartFrame: number;
  layout: "portrait" | "landscape";
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame - outroStartFrame;
  const isLandscape = layout === "landscape";

  if (localFrame < 0) return null;

  // Karanlık arka plan fade
  const overlayOpacity = interpolate(localFrame, [0, 20], [0, 0.88], {
    extrapolateRight: "clamp",
  });

  // Kart: aşağıdan yukarı slide
  const cardY = interpolate(localFrame, [12, 45], [80, 0], {
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const cardOpacity = interpolate(localFrame, [12, 38], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Galeri logosu
  const logoScale = spring({
    frame: Math.max(0, localFrame - 8),
    fps,
    from: 0.75,
    to: 1,
    config: { damping: 18, mass: 0.5 },
  });

  // CTA butonu
  const ctaScale = spring({
    frame: Math.max(0, localFrame - 48),
    fps,
    from: 0.82,
    to: 1,
    config: { damping: 15, mass: 0.45 },
  });
  const ctaOpacity = interpolate(localFrame, [48, 64], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <>
      {/* Karanlık overlay */}
      <AbsoluteFill
        style={{
          background: `rgba(4,4,8,${overlayOpacity})`,
          pointerEvents: "none",
        }}
      />

      {/* Glassmorphic kart */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: isLandscape ? "0 96px" : "0 56px",
          opacity: cardOpacity,
          transform: `translateY(${cardY}px)`,
        }}
      >
        <div
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(36px)",
            WebkitBackdropFilter: "blur(36px)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 44,
            padding: isLandscape ? "48px 64px" : "64px 72px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          {/* Galeri logosu */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 48,
              transform: `scale(${logoScale})`,
              transformOrigin: "center",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "linear-gradient(135deg, #f97316, #ef4444)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 24px rgba(249,115,22,0.45)",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M18 3a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h12zm-1 5H7v2h10V8zm0 4H7v2h10v-2z" />
              </svg>
            </div>
            <span
              style={{
                fontFamily: "sans-serif",
                fontWeight: 700,
                fontSize: 38,
                color: "#ffffff",
                letterSpacing: "1px",
              }}
            >
              {galleryName}
            </span>
          </div>

          {/* Araç bilgisi */}
          <div
            style={{
              fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
              fontWeight: 700,
              fontSize: isLandscape ? 56 : 74,
              color: "#ffffff",
              letterSpacing: "4px",
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            {carBrand}
          </div>
          <div
            style={{
              fontFamily: "sans-serif",
              fontWeight: 300,
              fontSize: isLandscape ? 28 : 34,
              color: "rgba(255,255,255,0.62)",
              marginTop: 12,
              letterSpacing: "2.5px",
              textTransform: "uppercase",
            }}
          >
            {carModel}
          </div>

          {/* İnce ayraç */}
          <div
            style={{
              width: 48,
              height: "1px",
              background:
                "linear-gradient(to right, transparent, rgba(255,255,255,0.35), transparent)",
              margin: "32px 0",
            }}
          />

          {/* Fiyat */}
          <div
            style={{
              fontFamily: "sans-serif",
              fontWeight: 700,
              fontSize: isLandscape ? 46 : 56,
              color: "#f8c96a",
              letterSpacing: "1px",
              textShadow:
                "0 0 40px rgba(248,201,106,0.5), 0 2px 12px rgba(0,0,0,0.3)",
            }}
          >
            {price}
          </div>

          {/* CTA butonu */}
          <div
            style={{
              marginTop: isLandscape ? 36 : 52,
              opacity: ctaOpacity,
              transform: `scale(${ctaScale})`,
              background: ctaPhone
                ? "linear-gradient(135deg, #25D366, #128C7E)"
                : "linear-gradient(135deg, #f97316, #dc2626)",
              borderRadius: 24,
              padding: isLandscape ? "22px 52px" : "28px 68px",
              display: "flex",
              alignItems: "center",
              gap: 16,
              boxShadow: ctaPhone
                ? "0 8px 48px rgba(37,211,102,0.4)"
                : "0 8px 48px rgba(249,115,22,0.45)",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
            </svg>
            <span
              style={{
                fontFamily: "sans-serif",
                fontWeight: 700,
                fontSize: isLandscape ? 28 : 34,
                color: "#ffffff",
                letterSpacing: "0.5px",
              }}
            >
              {ctaPhone ?? "İletişime Geç"}
            </span>
          </div>
        </div>
      </AbsoluteFill>
    </>
  );
}

/* ─── Ana kompozisyon ────────────────────────────────────── */

export const PrestigeReels: React.FC<PrestigeReelsProps> = ({
  mediaItems,
  carBrand,
  carModel,
  year,
  price,
  galleryName,
  ctaPhone,
  layout = "landscape",
  aspectRatio,
  outroFrames = OUTRO_FRAMES,
  reelStyle = "cinematic",
  km,
  motor,
  renk,
  vites,
  yakit,
  kasa,
  seri,
  aracDurumu,
  motorGucu,
  motorHacmi,
  cekis,
  garanti,
  agirHasarKayitli,
  plaka,
  ilanTarihi,
}) => {
  // aspectRatio verilmişse layout'u ondan türet
  const effectiveLayout: "portrait" | "landscape" =
    aspectRatio ? aspectRatioToLayout(aspectRatio) : layout;
  const frame = useCurrentFrame();
  const preset = STYLE_PRESETS[reelStyle];
  const safeOutroFrames = Math.max(0, outroFrames);
  const totalFrames = getTotalFrames(mediaItems, { outroFrames: safeOutroFrames, crossfadeFrames: preset.crossfadeFrames });
  const outroStartFrame = totalFrames - safeOutroFrames;

  // Aktif sahnede hangi variant çalışıyor?
  let activeVariant = "full_bleed";
  for (let i = 0; i < mediaItems.length; i++) {
    const start   = getItemStartFrame(mediaItems, i, preset.crossfadeFrames);
    const isLast  = i === mediaItems.length - 1;
    const nextStart = isLast ? Infinity : getItemStartFrame(mediaItems, i + 1, preset.crossfadeFrames);
    if (frame >= start && frame < nextStart) {
      activeVariant = mediaItems[i].sceneVariant ?? "full_bleed";
      break;
    }
  }

  // Kendi metin/overlay sistemi olan layout'larda global elementler gizlenir
  const SUPPRESS_TEXT = new Set([
    "split_specs", "spec_table", "side_table",
    "card_panel", "letter_box", "feature_hero",
    "duo_split", "trio_mosaic",
    // Kendi bilgilerini içeren layoutlar
    "framed_center", "editorial_right", "editorial_left", "listing_panel",
  ]);
  const SUPPRESS_OVERLAYS = new Set([
    "card_panel", "letter_box", "feature_hero",
    "duo_split", "trio_mosaic",
    "split_specs", "side_table",
    "framed_center", "editorial_right", "editorial_left", "listing_panel",
  ]);

  const hideTextBlock = SUPPRESS_TEXT.has(activeVariant);
  const hideOverlays  = SUPPRESS_OVERLAYS.has(activeVariant);

  return (
    <AbsoluteFill style={{ background: "#060608", overflow: "hidden" }}>
      {/* Medya katmanları */}
      {mediaItems.map((item, i) => (
        <MediaSlide
          key={i} item={item} index={i} items={mediaItems} preset={preset}
          carBrand={carBrand} carModel={carModel} year={year} price={price}
          aspectRatio={aspectRatio}
          km={km} motor={motor} renk={renk} vites={vites} yakit={yakit} kasa={kasa}
          seri={seri} aracDurumu={aracDurumu} motorGucu={motorGucu} motorHacmi={motorHacmi}
          cekis={cekis} garanti={garanti} agirHasarKayitli={agirHasarKayitli} plaka={plaka} ilanTarihi={ilanTarihi}
        />
      ))}

      {/* Geçiş light leak */}
      <LightLeak items={mediaItems} preset={preset} />

      {/* Film grain */}
      <FilmGrain opacity={preset.grainOpacity} />

      {/* Vignette + gradients — kart layoutlarda kapatılır */}
      {!hideOverlays && <Vignette />}
      {!hideOverlays && <TopGradient />}

      {/* Slayt ilerleme noktaları */}
      {!hideOverlays && (
        <ProgressDots items={mediaItems} totalFrames={totalFrames} outroFrames={safeOutroFrames} crossfadeFrames={preset.crossfadeFrames} />
      )}

      {/* Galeri rozeti */}
      {!hideOverlays && <GalleryBadge name={galleryName} layout={effectiveLayout} />}

      {/* Alt metin — kendi layout'u olan sahnelerde gizle */}
      {!hideTextBlock && (
        <TextBlock
          carBrand={carBrand}
          carModel={carModel}
          year={year}
          price={price}
          layout={effectiveLayout}
        />
      )}

      {/* Outro CTA */}
      {safeOutroFrames > 0 && (
        <OutroFrame
          carBrand={carBrand}
          carModel={carModel}
          price={price}
          galleryName={galleryName}
          ctaPhone={ctaPhone}
          outroStartFrame={outroStartFrame}
          layout={effectiveLayout}
        />
      )}
    </AbsoluteFill>
  );
};
