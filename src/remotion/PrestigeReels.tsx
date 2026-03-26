import {
  AbsoluteFill,
  Img,
  Video,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";

/* ─── Tipler ─────────────────────────────────────────────── */

export type MediaItem = {
  src: string;
  type: "image" | "video";
};

export type PrestigeReelsProps = {
  mediaItems: MediaItem[];
  carBrand: string;
  carModel: string;
  year: string;
  price: string;
  galleryName: string;
  ctaPhone?: string;
};

/* ─── Zamanlama sabitleri ────────────────────────────────── */

export const PHOTO_FRAMES = 90;
export const VIDEO_FRAMES = 150;
export const CROSSFADE_FRAMES = 30;
export const OUTRO_FRAMES = 90;

/* ─── Yardımcı fonksiyonlar ──────────────────────────────── */

export function getItemDuration(item: MediaItem): number {
  return item.type === "video" ? VIDEO_FRAMES : PHOTO_FRAMES;
}

export function getItemStartFrame(items: MediaItem[], idx: number): number {
  let start = 0;
  for (let i = 0; i < idx; i++) {
    start += getItemDuration(items[i]) - CROSSFADE_FRAMES;
  }
  return start;
}

export function getTotalFrames(items: MediaItem[]): number {
  if (!items.length) return 30;
  let total = getItemDuration(items[0]);
  for (let i = 1; i < items.length; i++) {
    total += getItemDuration(items[i]) - CROSSFADE_FRAMES;
  }
  return total + OUTRO_FRAMES;
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

/* ─── Per-slide sinematik renk gradyanları ───────────────── */

const COLOR_GRADES = [
  "contrast(1.12) saturate(0.72) brightness(0.88)",                        // neutral
  "contrast(1.08) saturate(0.65) brightness(0.86) sepia(0.07)",            // warm
  "contrast(1.16) saturate(0.68) brightness(0.90) hue-rotate(-8deg)",      // cool
  "contrast(1.10) saturate(0.78) brightness(0.87)",                        // vivid
  "contrast(1.12) saturate(0.60) brightness(0.85) sepia(0.05)",            // muted warm
];

/* ─── Tek bir medya slaydı ───────────────────────────────── */

function MediaSlide({
  item,
  index,
  items,
}: {
  item: MediaItem;
  index: number;
  items: MediaItem[];
}) {
  const frame = useCurrentFrame();
  const startFrame = getItemStartFrame(items, index);
  const duration = getItemDuration(item);
  const endFrame = startFrame + duration;

  const opacity = interpolate(
    frame,
    [startFrame, startFrame + CROSSFADE_FRAMES, endFrame - CROSSFADE_FRAMES, endFrame],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  if (opacity === 0) return null;

  const kb = KB_VARIANTS[index % KB_VARIANTS.length];
  const rawProgress = duration > 0 ? Math.max(0, frame - startFrame) / duration : 0;
  const progress = easeInOut(Math.min(1, rawProgress));

  const scale = kb.fromScale + (kb.toScale - kb.fromScale) * progress;
  const tx = kb.fromX + (kb.toX - kb.fromX) * progress;
  const ty = kb.fromY + (kb.toY - kb.fromY) * progress;

  const colorGrade = COLOR_GRADES[index % COLOR_GRADES.length];

  const mediaStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: `scale(${scale}) translate(${tx}px, ${ty}px)`,
    transformOrigin: "center center",
    filter: colorGrade,
  };

  return (
    <AbsoluteFill style={{ opacity, overflow: "hidden" }}>
      {item.type === "image" ? (
        <Img src={item.src} style={mediaStyle} />
      ) : (
        <Video src={item.src} style={mediaStyle} startFrom={0} muted />
      )}
    </AbsoluteFill>
  );
}

/* ─── Slaytlar arası ışık flaşı ─────────────────────────── */

function TransitionFlash({ items }: { items: MediaItem[] }) {
  const frame = useCurrentFrame();

  let flashOpacity = 0;

  for (let i = 0; i < items.length - 1; i++) {
    const nextStart = getItemStartFrame(items, i + 1);
    // Geçişin orta noktası
    const midpoint = nextStart - Math.floor(CROSSFADE_FRAMES / 2);
    const halfFlash = 6;

    const local = frame - (midpoint - halfFlash);
    if (local >= 0 && local <= halfFlash * 2) {
      const t = local / (halfFlash * 2);
      // Üçgen tepe: t=0.5'te max
      const peakT = t < 0.5 ? t * 2 : (1 - t) * 2;
      flashOpacity = Math.max(flashOpacity, easeOut(peakT) * 0.22);
    }
  }

  if (flashOpacity === 0) return null;

  return (
    <AbsoluteFill
      style={{
        background: `rgba(255,255,255,${flashOpacity})`,
        pointerEvents: "none",
      }}
    />
  );
}

/* ─── Slayt ilerleme göstergesi (sağ taraf, dikey) ─────── */

function ProgressDots({
  items,
  totalFrames,
}: {
  items: MediaItem[];
  totalFrames: number;
}) {
  const frame = useCurrentFrame();
  const outroStart = totalFrames - OUTRO_FRAMES;

  // Outro'da gizle
  const dotsOpacity = interpolate(
    frame,
    [outroStart - 20, outroStart],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  if (items.length <= 1) return null;

  // Hangi slayt aktif?
  let activeIndex = 0;
  for (let i = items.length - 1; i >= 0; i--) {
    if (frame >= getItemStartFrame(items, i)) {
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
}: {
  carBrand: string;
  carModel: string;
  year: string;
  price: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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
        padding: "0 72px 96px",
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
          fontSize: 96,
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
          fontSize: 38,
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
            fontSize: 30,
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
            fontSize: 52,
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

function GalleryBadge({ name }: { name: string }) {
  const frame = useCurrentFrame();

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
        top: 68,
        right: 68,
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
          fontSize: 30,
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
}: {
  carBrand: string;
  carModel: string;
  price: string;
  galleryName: string;
  ctaPhone?: string;
  outroStartFrame: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame - outroStartFrame;

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
          padding: "0 56px",
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
            padding: "64px 72px",
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
              fontSize: 74,
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
              fontSize: 34,
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
              fontSize: 56,
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
              marginTop: 52,
              opacity: ctaOpacity,
              transform: `scale(${ctaScale})`,
              background: ctaPhone
                ? "linear-gradient(135deg, #25D366, #128C7E)"
                : "linear-gradient(135deg, #f97316, #dc2626)",
              borderRadius: 24,
              padding: "28px 68px",
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
                fontSize: 34,
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
}) => {
  const totalFrames = getTotalFrames(mediaItems);
  const outroStartFrame = totalFrames - OUTRO_FRAMES;

  return (
    <AbsoluteFill style={{ background: "#060608", overflow: "hidden" }}>
      {/* Medya katmanları */}
      {mediaItems.map((item, i) => (
        <MediaSlide key={i} item={item} index={i} items={mediaItems} />
      ))}

      {/* Slayt geçiş ışık flaşı */}
      <TransitionFlash items={mediaItems} />

      {/* Vignette + alt gradient */}
      <Vignette />

      {/* Üst gradient */}
      <TopGradient />

      {/* Slayt ilerleme noktaları */}
      <ProgressDots items={mediaItems} totalFrames={totalFrames} />

      {/* Galeri rozeti */}
      <GalleryBadge name={galleryName} />

      {/* Alt metin */}
      <TextBlock
        carBrand={carBrand}
        carModel={carModel}
        year={year}
        price={price}
      />

      {/* Outro CTA */}
      <OutroFrame
        carBrand={carBrand}
        carModel={carModel}
        price={price}
        galleryName={galleryName}
        ctaPhone={ctaPhone}
        outroStartFrame={outroStartFrame}
      />
    </AbsoluteFill>
  );
};
