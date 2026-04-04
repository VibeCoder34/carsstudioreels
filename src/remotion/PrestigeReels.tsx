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

export type PrestigeReelsProps = {
  mediaItems: MediaItem[];
  carBrand: string;
  carModel: string;
  year: string;
  price: string;
  galleryName: string;
  ctaPhone?: string;
  layout?: "portrait" | "landscape";
  outroFrames?: number;
  reelStyle?: ReelStyle;
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

/* ─── Tek bir medya slaydı ───────────────────────────────── */

function MediaSlide({
  item,
  index,
  items,
  preset,
}: {
  item: MediaItem;
  index: number;
  items: MediaItem[];
  preset: StylePreset;
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
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "72%", overflow: "hidden" }}>
          <Img src={item.src} style={mediaStyle} />
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

  return (
    <AbsoluteFill style={{ opacity, overflow: "hidden" }}>
      {item.type === "image" ? (
        <Img src={item.src} style={mediaStyle} />
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
  outroFrames = OUTRO_FRAMES,
  reelStyle = "cinematic",
}) => {
  const preset = STYLE_PRESETS[reelStyle];
  const safeOutroFrames = Math.max(0, outroFrames);
  const totalFrames = getTotalFrames(mediaItems, { outroFrames: safeOutroFrames, crossfadeFrames: preset.crossfadeFrames });
  const outroStartFrame = totalFrames - safeOutroFrames;

  return (
    <AbsoluteFill style={{ background: "#060608", overflow: "hidden" }}>
      {/* Medya katmanları */}
      {mediaItems.map((item, i) => (
        <MediaSlide key={i} item={item} index={i} items={mediaItems} preset={preset} />
      ))}

      {/* Geçiş light leak */}
      <LightLeak items={mediaItems} preset={preset} />

      {/* Film grain */}
      <FilmGrain opacity={preset.grainOpacity} />

      {/* Vignette + alt gradient */}
      <Vignette />

      {/* Üst gradient */}
      <TopGradient />

      {/* Slayt ilerleme noktaları */}
      <ProgressDots items={mediaItems} totalFrames={totalFrames} outroFrames={safeOutroFrames} crossfadeFrames={preset.crossfadeFrames} />

      {/* Galeri rozeti */}
      <GalleryBadge name={galleryName} layout={layout} />

      {/* Alt metin */}
      <TextBlock
        carBrand={carBrand}
        carModel={carModel}
        year={year}
        price={price}
        layout={layout}
      />

      {/* Outro CTA */}
      {safeOutroFrames > 0 && (
        <OutroFrame
          carBrand={carBrand}
          carModel={carModel}
          price={price}
          galleryName={galleryName}
          ctaPhone={ctaPhone}
          outroStartFrame={outroStartFrame}
          layout={layout}
        />
      )}
    </AbsoluteFill>
  );
};
