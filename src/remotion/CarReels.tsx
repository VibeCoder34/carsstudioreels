import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";

export type CarReelsProps = {
  photos: string[];
  carName: string;
  carModel: string;
  price: string;
  galleryName: string;
};

const FRAMES_PER_PHOTO = 75; // 2.5 saniye @ 30fps
const TRANSITION_FRAMES = 18; // 0.6 saniyelik crossfade

// Tek bir fotoğraf katmanı: fade-in, Ken Burns zoom, fade-out
function PhotoLayer({
  src,
  index,
}: {
  src: string;
  index: number;
}) {
  const frame = useCurrentFrame();

  const startFrame = index * FRAMES_PER_PHOTO;
  const endFrame = startFrame + FRAMES_PER_PHOTO;

  // Opacity: fade in → tam görünür → fade out
  const opacity = interpolate(
    frame,
    [
      startFrame,
      startFrame + TRANSITION_FRAMES,
      endFrame - TRANSITION_FRAMES,
      endFrame,
    ],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Ken Burns: hafif zoom efekti (1.00 → 1.06)
  const localFrame = Math.max(0, frame - startFrame);
  const scale = interpolate(
    localFrame,
    [0, FRAMES_PER_PHOTO],
    [1.0, 1.06],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  if (opacity === 0) return null;

  return (
    <AbsoluteFill style={{ opacity }}>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      />
    </AbsoluteFill>
  );
}

// Sol alttaki araç bilgisi yazısı
function CarInfo({
  carName,
  carModel,
  price,
}: {
  carName: string;
  carModel: string;
  price: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Metin ilk açılışta aşağıdan yukarıya süzülsün
  const slideUp = spring({
    frame,
    fps,
    from: 60,
    to: 0,
    config: { damping: 18, mass: 0.6 },
  });

  const textOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "0 64px 80px",
        transform: `translateY(${slideUp}px)`,
        opacity: textOpacity,
      }}
    >
      {/* Araç adı */}
      <div
        style={{
          fontFamily: "sans-serif",
          fontWeight: 900,
          fontSize: 72,
          color: "#ffffff",
          lineHeight: 1.05,
          textShadow: "0 2px 20px rgba(0,0,0,0.6)",
          letterSpacing: "-1px",
        }}
      >
        {carName}
      </div>

      {/* Model */}
      <div
        style={{
          fontFamily: "sans-serif",
          fontWeight: 500,
          fontSize: 40,
          color: "rgba(255,255,255,0.75)",
          marginTop: 8,
          textShadow: "0 2px 12px rgba(0,0,0,0.5)",
        }}
      >
        {carModel}
      </div>

      {/* Fiyat */}
      <div
        style={{
          fontFamily: "sans-serif",
          fontWeight: 800,
          fontSize: 56,
          color: "#f97316",
          marginTop: 16,
          textShadow: "0 2px 16px rgba(249,115,22,0.4)",
        }}
      >
        {price}
      </div>
    </div>
  );
}

// Sağ üstte CarStudio logosu
function GalleryBadge({ name }: { name: string }) {
  const frame = useCurrentFrame();

  const badgeOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        right: 60,
        opacity: badgeOpacity,
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 16,
        padding: "12px 20px",
      }}
    >
      {/* Küçük turuncu kare logo */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "linear-gradient(135deg, #f97316, #ef4444)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          <path d="M18 3a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h12zm-1 5H7v2h10V8zm0 4H7v2h10v-2z" />
        </svg>
      </div>
      <span
        style={{
          fontFamily: "sans-serif",
          fontWeight: 700,
          fontSize: 28,
          color: "#ffffff",
          letterSpacing: "0.5px",
        }}
      >
        {name}
      </span>
    </div>
  );
}

// Fotoğraf numaratörü (örn: 2 / 3)
function PhotoCounter({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        right: 60,
        fontFamily: "sans-serif",
        fontWeight: 600,
        fontSize: 28,
        color: "rgba(255,255,255,0.6)",
      }}
    >
      {current} / {total}
    </div>
  );
}

// Ana kompozisyon
export const CarReels: React.FC<CarReelsProps> = ({
  photos,
  carName,
  carModel,
  price,
  galleryName,
}) => {
  const frame = useCurrentFrame();
  const currentPhotoIndex = Math.min(
    Math.floor(frame / FRAMES_PER_PHOTO),
    photos.length - 1
  );

  return (
    <AbsoluteFill style={{ background: "#0a0a0a", overflow: "hidden" }}>

      {/* Fotoğraf katmanları — crossfade için üst üste renderlanır */}
      {photos.map((src, i) => (
        <PhotoLayer key={i} src={src} index={i} />
      ))}

      {/* Koyu gradient overlay — alt ve üst kenarlarda */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.18) 40%, rgba(0,0,0,0.28) 80%, rgba(0,0,0,0.45) 100%)",
        }}
      />

      {/* Sağ üst: CarStudio rozeti */}
      <GalleryBadge name={galleryName} />

      {/* Sol alt: araç bilgisi */}
      <CarInfo carName={carName} carModel={carModel} price={price} />

      {/* Sağ alt: fotoğraf sayacı */}
      <PhotoCounter
        current={currentPhotoIndex + 1}
        total={photos.length}
      />
    </AbsoluteFill>
  );
};
