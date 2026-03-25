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
  carBrand: string;   // "BMW"
  carModel: string;   // "5 Serisi 530i xDrive"
  year: string;       // "2024"
  price: string;      // "₺2.850.000"
  galleryName: string;
  ctaPhone?: string;
};

/* ─── Zamanlama sabitleri ────────────────────────────────── */

export const PHOTO_FRAMES = 90;   // 3 saniye
export const VIDEO_FRAMES = 150;  // 5 saniye
export const CROSSFADE_FRAMES = 30; // 1 saniyelik geçiş
export const OUTRO_FRAMES = 90;   // 3 saniyelik CTA

/* ─── Yardımcı fonksiyonlar (demo page'de de kullanılır) ── */

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

/* ─── Ken Burns varyantları — her slayt farklı hareket ──── */

const KB_VARIANTS = [
  { fromScale: 1.0,  toScale: 1.08, fromX: 0,   toX: 0,   fromY: 0,   toY: 0   }, // zoom in
  { fromScale: 1.08, toScale: 1.0,  fromX: 0,   toX: 0,   fromY: 0,   toY: 0   }, // zoom out
  { fromScale: 1.05, toScale: 1.05, fromX: -30, toX: 30,  fromY: 0,   toY: 0   }, // pan sağa
  { fromScale: 1.05, toScale: 1.05, fromX: 30,  toX: -30, fromY: 0,   toY: 0   }, // pan sola
  { fromScale: 1.03, toScale: 1.08, fromX: 0,   toX: 0,   fromY: 20,  toY: -20 }, // yukarı + zoom
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

  // Crossfade opacity
  const opacity = interpolate(
    frame,
    [startFrame, startFrame + CROSSFADE_FRAMES, endFrame - CROSSFADE_FRAMES, endFrame],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  if (opacity === 0) return null;

  const kb = KB_VARIANTS[index % KB_VARIANTS.length];
  const progress = duration > 0 ? Math.max(0, frame - startFrame) / duration : 0;

  const scale = kb.fromScale + (kb.toScale - kb.fromScale) * progress;
  const tx = kb.fromX + (kb.toX - kb.fromX) * progress;
  const ty = kb.fromY + (kb.toY - kb.fromY) * progress;

  const mediaStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: `scale(${scale}) translate(${tx}px, ${ty}px)`,
    transformOrigin: "center center",
    // Sinematik renk gradyanı
    filter: "contrast(1.1) saturate(0.75) brightness(0.9)",
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

/* ─── Vignette ───────────────────────────────────────────── */

function Vignette() {
  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, transparent 38%, rgba(0,0,0,0.78) 100%)",
        pointerEvents: "none",
      }}
    />
  );
}

/* ─── Üst gradient (badge için) ─────────────────────────── */

function TopGradient() {
  return (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 22%)",
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

  // Dekoratif çizgi genişliği
  const lineWidth = interpolate(frame, [12, 32], [0, 68], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Marka adı: aşağıdan yukarı + fade
  const brandY = interpolate(frame, [22, 48], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const brandOpacity = interpolate(frame, [22, 48], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Model: biraz sonra fade in
  const modelOpacity = interpolate(frame, [38, 62], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fiyat: spring ile çıkış
  const priceScale = spring({
    frame: Math.max(0, frame - 60),
    fps,
    from: 0.85,
    to: 1,
    config: { damping: 18, mass: 0.6 },
  });
  const priceOpacity = interpolate(frame, [60, 82], [0, 1], {
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
        padding: "0 72px 88px",
        background:
          "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.5) 55%, transparent 100%)",
      }}
    >
      {/* İnce dekoratif çizgi */}
      <div
        style={{
          width: `${lineWidth}px`,
          height: "2px",
          background:
            "linear-gradient(to right, rgba(255,255,255,0.9), rgba(255,255,255,0))",
          marginBottom: 26,
        }}
      />

      {/* Araç markası — Playfair Display */}
      <div
        style={{
          fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
          fontWeight: 700,
          fontSize: 92,
          color: "#ffffff",
          letterSpacing: "4px",
          textTransform: "uppercase",
          lineHeight: 1,
          opacity: brandOpacity,
          transform: `translateY(${brandY}px)`,
          textShadow: "0 4px 32px rgba(0,0,0,0.6)",
        }}
      >
        {carBrand}
      </div>

      {/* Model */}
      <div
        style={{
          fontFamily: "sans-serif",
          fontWeight: 300,
          fontSize: 40,
          color: "rgba(255,255,255,0.78)",
          letterSpacing: "2.5px",
          marginTop: 12,
          opacity: modelOpacity,
          textShadow: "0 2px 16px rgba(0,0,0,0.5)",
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
          gap: 22,
          marginTop: 24,
          opacity: priceOpacity,
          transform: `scale(${priceScale})`,
          transformOrigin: "left center",
        }}
      >
        <span
          style={{
            fontFamily: "sans-serif",
            fontWeight: 300,
            fontSize: 32,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "2px",
          }}
        >
          {year}
        </span>
        <div
          style={{
            width: "1px",
            height: "32px",
            background: "rgba(255,255,255,0.25)",
          }}
        />
        <span
          style={{
            fontFamily: "sans-serif",
            fontWeight: 700,
            fontSize: 54,
            color: "#f8c96a",
            letterSpacing: "1px",
            textShadow: "0 0 30px rgba(248,201,106,0.4)",
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
  const opacity = interpolate(frame, [18, 42], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 68,
        right: 68,
        opacity,
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "rgba(0,0,0,0.38)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 18,
        padding: "14px 24px",
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

/* ─── Outro / CTA ekranı ─────────────────────────────────── */

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

  const overlayOpacity = interpolate(localFrame, [0, 18], [0, 0.82], {
    extrapolateRight: "clamp",
  });

  const contentY = interpolate(localFrame, [15, 42], [50, 0], {
    extrapolateRight: "clamp",
  });
  const contentOpacity = interpolate(localFrame, [15, 42], [0, 1], {
    extrapolateRight: "clamp",
  });

  const ctaScale = spring({
    frame: Math.max(0, localFrame - 40),
    fps,
    from: 0.8,
    to: 1,
    config: { damping: 16, mass: 0.5 },
  });
  const ctaOpacity = interpolate(localFrame, [40, 58], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <>
      {/* Karanlık overlay */}
      <AbsoluteFill
        style={{ background: `rgba(0,0,0,${overlayOpacity})`, pointerEvents: "none" }}
      />

      {/* İçerik */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 80px",
          textAlign: "center",
          opacity: contentOpacity,
          transform: `translateY(${contentY}px)`,
        }}
      >
        {/* Galeri logosu */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 52,
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 14,
              background: "linear-gradient(135deg, #f97316, #ef4444)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
              <path d="M18 3a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h12zm-1 5H7v2h10V8zm0 4H7v2h10v-2z" />
            </svg>
          </div>
          <span
            style={{
              fontFamily: "sans-serif",
              fontWeight: 700,
              fontSize: 40,
              color: "#ffffff",
              letterSpacing: "0.5px",
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
            fontSize: 78,
            color: "#ffffff",
            letterSpacing: "3px",
            textTransform: "uppercase",
            lineHeight: 1.05,
          }}
        >
          {carBrand}
        </div>
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 300,
            fontSize: 36,
            color: "rgba(255,255,255,0.68)",
            marginTop: 10,
            letterSpacing: "2px",
            textTransform: "uppercase",
          }}
        >
          {carModel}
        </div>

        {/* Ayraç */}
        <div
          style={{
            width: 60,
            height: "1px",
            background: "rgba(255,255,255,0.28)",
            margin: "36px 0",
          }}
        />

        {/* Fiyat */}
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 700,
            fontSize: 58,
            color: "#f8c96a",
            textShadow: "0 0 40px rgba(248,201,106,0.45)",
          }}
        >
          {price}
        </div>

        {/* CTA butonu */}
        <div
          style={{
            marginTop: 56,
            opacity: ctaOpacity,
            transform: `scale(${ctaScale})`,
            background: ctaPhone
              ? "linear-gradient(135deg, #25D366, #128C7E)"
              : "linear-gradient(135deg, #f97316, #dc2626)",
            borderRadius: 22,
            padding: "26px 64px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            boxShadow: ctaPhone
              ? "0 8px 40px rgba(37,211,102,0.35)"
              : "0 8px 40px rgba(249,115,22,0.4)",
          }}
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill="white">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
          </svg>
          <span
            style={{
              fontFamily: "sans-serif",
              fontWeight: 700,
              fontSize: 36,
              color: "#ffffff",
              letterSpacing: "1px",
            }}
          >
            {ctaPhone ? ctaPhone : "İletişime Geç"}
          </span>
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
    <AbsoluteFill style={{ background: "#080808", overflow: "hidden" }}>
      {/* Medya katmanları */}
      {mediaItems.map((item, i) => (
        <MediaSlide key={i} item={item} index={i} items={mediaItems} />
      ))}

      {/* Vignette */}
      <Vignette />

      {/* Üst gradient */}
      <TopGradient />

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
