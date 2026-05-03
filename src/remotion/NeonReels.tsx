import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  Video,
  getRemotionEnvironment,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import type { LanguageCode } from "@/lib/languages";
import { defaultCurrencyForLanguage, formatPrice, type CurrencyCode } from "@/lib/money";
import {
  STYLE_PRESETS,
  aspectRatioToLayout,
  getItemDuration,
  getItemStartFrame,
  getTotalFrames,
  type MediaItem,
  type PrestigeReelsProps,
  type ReelStyle,
} from "./PrestigeReels";
import { resolveShotCategoryLabel } from "@/lib/photoCategories";

// Render sırasında backdropFilter blur'ı kapat — swangle'da çok yavaş
function renderBlur(value: string): string | undefined {
  try {
    return getRemotionEnvironment().isRendering ? undefined : value;
  } catch {
    return value;
  }
}
import { translateEnumValue, translateListingValuesForVideo, translateYesNo } from "@/lib/vehicleEnumI18n";
import { buildOutroGridRowsOnly, type ListingPayload } from "@/lib/listingPayload";

type VideoLanguage = LanguageCode;

const UI_TEXT_SCALE = 2.0;
const uiFont = (n: number) => Math.round(n * UI_TEXT_SCALE);

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.trim().replace(/^#/, "");
  if (h.length !== 6) return null;
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null;
  return { r, g, b };
}

function alpha(hex: string, a: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(255,255,255,${clamp01(a)})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${clamp01(a)})`;
}

const NEON_STYLE: Record<
  ReelStyle,
  {
    accent: string;
    accent2: string;
    gridOpacity: number;
    scanOpacity: number;
    chroma: number; // px
    vignette: number; // 0..1
    noise: number; // 0..1
    hudDensity: number; // 0..1
  }
> = {
  cinematic: {
    accent: "#7c3aed", // violet
    accent2: "#22d3ee", // cyan
    gridOpacity: 0.18,
    scanOpacity: 0.16,
    chroma: 3.5,
    vignette: 0.38,
    noise: 0.18,
    hudDensity: 0.55,
  },
  dynamic: {
    accent: "#f97316", // orange
    accent2: "#22c55e", // green
    gridOpacity: 0.22,
    scanOpacity: 0.22,
    chroma: 6.0,
    vignette: 0.28,
    noise: 0.26,
    hudDensity: 0.75,
  },
  luxury: {
    accent: "#f8c96a", // gold
    accent2: "#60a5fa", // soft blue
    gridOpacity: 0.14,
    scanOpacity: 0.12,
    chroma: 2.8,
    vignette: 0.42,
    noise: 0.14,
    hudDensity: 0.45,
  },
};

function labelPackFor(lang: VideoLanguage): {
  modelYear: string;
  vehicleCondition: string;
  salePrice: string;
  contact: string;
  phone: string;
  warranty: string;
  heavyDamage: string;
  listingDate: string;
  plate: string;
  series: string;
  engineGeneric: string;
  labels: {
    km: string;
    gearbox: string;
    fuel: string;
    body: string;
    price: string;
    enginePower: string;
    engineDisplacement: string;
    drivetrain: string;
    color: string;
  };
} {
  const packs: Record<VideoLanguage, ReturnType<typeof labelPackFor>> = {
    tr: {
      modelYear: "MODEL YILI",
      vehicleCondition: "ARAÇ DURUMU",
      salePrice: "SATIŞ FİYATI",
      contact: "İLETİŞİM",
      phone: "TEL",
      warranty: "GARANTİ",
      heavyDamage: "AĞIR HASAR",
      listingDate: "İLAN TARİHİ",
      plate: "PLAKA",
      series: "SERİ",
      engineGeneric: "MOTOR",
      labels: {
        km: "KM",
        gearbox: "VİTES",
        fuel: "YAKIT",
        body: "KASA",
        price: "FİYAT",
        enginePower: "MOTOR GÜCÜ",
        engineDisplacement: "MOTOR HACMİ",
        drivetrain: "ÇEKİŞ",
        color: "RENK",
      },
    },
    en: {
      modelYear: "MODEL YEAR",
      vehicleCondition: "CONDITION",
      salePrice: "PRICE",
      contact: "CONTACT",
      phone: "PHONE",
      warranty: "WARRANTY",
      heavyDamage: "HEAVY DAMAGE",
      listingDate: "LISTING DATE",
      plate: "PLATE",
      series: "SERIES",
      engineGeneric: "ENGINE",
      labels: {
        km: "MILEAGE",
        gearbox: "GEARBOX",
        fuel: "FUEL",
        body: "BODY",
        price: "PRICE",
        enginePower: "POWER",
        engineDisplacement: "DISPLACEMENT",
        drivetrain: "DRIVETRAIN",
        color: "COLOR",
      },
    },
    es: {
      modelYear: "AÑO",
      vehicleCondition: "CONDICIÓN",
      salePrice: "PRECIO",
      contact: "CONTACTO",
      phone: "TEL",
      warranty: "GARANTÍA",
      heavyDamage: "DAÑO GRAVE",
      listingDate: "FECHA",
      plate: "MATRÍCULA",
      series: "SERIE",
      engineGeneric: "MOTOR",
      labels: {
        km: "KM",
        gearbox: "CAJA",
        fuel: "COMBUSTIBLE",
        body: "CARROCERÍA",
        price: "PRECIO",
        enginePower: "POTENCIA",
        engineDisplacement: "CILINDRADA",
        drivetrain: "TRACCIÓN",
        color: "COLOR",
      },
    },
    fr: {
      modelYear: "ANNÉE",
      vehicleCondition: "ÉTAT",
      salePrice: "PRIX",
      contact: "CONTACT",
      phone: "TÉL",
      warranty: "GARANTIE",
      heavyDamage: "GROS SINISTRE",
      listingDate: "DATE",
      plate: "PLAQUE",
      series: "SÉRIE",
      engineGeneric: "MOTEUR",
      labels: {
        km: "KM",
        gearbox: "BOÎTE",
        fuel: "CARBURANT",
        body: "CARROSSERIE",
        price: "PRIX",
        enginePower: "PUISSANCE",
        engineDisplacement: "CYLINDRÉE",
        drivetrain: "TRANSMISSION",
        color: "COULEUR",
      },
    },
    de: {
      modelYear: "JAHR",
      vehicleCondition: "ZUSTAND",
      salePrice: "PREIS",
      contact: "KONTAKT",
      phone: "TEL",
      warranty: "GARANTIE",
      heavyDamage: "SCHWERER SCHADEN",
      listingDate: "DATUM",
      plate: "KENNZEICHEN",
      series: "SERIE",
      engineGeneric: "MOTOR",
      labels: {
        km: "KM",
        gearbox: "GETRIEBE",
        fuel: "KRAFTSTOFF",
        body: "KAROSSERIE",
        price: "PREIS",
        enginePower: "LEISTUNG",
        engineDisplacement: "HUBRAUM",
        drivetrain: "ANTRIEB",
        color: "FARBE",
      },
    },
    it: {
      modelYear: "ANNO",
      vehicleCondition: "CONDIZIONE",
      salePrice: "PREZZO",
      contact: "CONTATTO",
      phone: "TEL",
      warranty: "GARANZIA",
      heavyDamage: "DANNO GRAVE",
      listingDate: "DATA",
      plate: "TARGA",
      series: "SERIE",
      engineGeneric: "MOTORE",
      labels: {
        km: "KM",
        gearbox: "CAMBIO",
        fuel: "CARBURANTE",
        body: "CARROZZERIA",
        price: "PREZZO",
        enginePower: "POTENZA",
        engineDisplacement: "CILINDRATA",
        drivetrain: "TRAZIONE",
        color: "COLORE",
      },
    },
    ru: {
      modelYear: "ГОД",
      vehicleCondition: "СОСТОЯНИЕ",
      salePrice: "ЦЕНА",
      contact: "КОНТАКТ",
      phone: "ТЕЛ",
      warranty: "ГАРАНТИЯ",
      heavyDamage: "ТЯЖЕЛЫЙ УЩЕРБ",
      listingDate: "ДАТА",
      plate: "НОМЕР",
      series: "СЕРИЯ",
      engineGeneric: "ДВИГАТЕЛЬ",
      labels: {
        km: "ПРОБЕГ",
        gearbox: "КОРОБКА",
        fuel: "ТОПЛИВО",
        body: "КУЗОВ",
        price: "ЦЕНА",
        enginePower: "МОЩНОСТЬ",
        engineDisplacement: "ОБЪЁМ",
        drivetrain: "ПРИВОД",
        color: "ЦВЕТ",
      },
    },
    pt: {
      modelYear: "ANO",
      vehicleCondition: "CONDIÇÃO",
      salePrice: "PREÇO",
      contact: "CONTATO",
      phone: "TEL",
      warranty: "GARANTIA",
      heavyDamage: "SINISTRO GRAVE",
      listingDate: "DATA",
      plate: "MATRÍCULA",
      series: "SÉRIE",
      engineGeneric: "MOTOR",
      labels: {
        km: "KM",
        gearbox: "CAIXA",
        fuel: "COMBUSTÍVEL",
        body: "CARROCERIA",
        price: "PREÇO",
        enginePower: "POTÊNCIA",
        engineDisplacement: "CILINDRADA",
        drivetrain: "TRAÇÃO",
        color: "COR",
      },
    },
  };

  return packs[lang] ?? packs.en;
}

function Background({
  item,
  portrait,
  colorA,
  colorB,
}: {
  item: MediaItem;
  portrait: boolean;
  colorA: string;
  colorB: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame / fps) * 0.35;
  const wobble = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
  const glowA = alpha(colorA, 0.22 + 0.10 * wobble);
  const glowB = alpha(colorB, 0.16 + 0.10 * (1 - wobble));

  // Portrait/square: contain + blurred backdrop to avoid ugly crops
  const showBlur = portrait;

  const common: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  };

  const node =
    item.type === "video" ? (
      <Video
        src={item.src}
        startFrom={item.inFrame}
        endAt={item.outFrame}
        style={{
          ...common,
          objectFit: "cover",
          transform: "scale(1.03)",
        }}
      />
    ) : (
      <Img
        src={item.src}
        style={{
          ...common,
          objectFit: "cover",
          transform: "scale(1.03)",
        }}
      />
    );

  return (
    <AbsoluteFill>
      {showBlur && (
        <>
          <AbsoluteFill style={{ filter: "blur(42px) brightness(0.75) saturate(1.15)" }}>{node}</AbsoluteFill>
          <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 35%, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.82) 70%)" }} />
        </>
      )}
      <AbsoluteFill style={{ opacity: showBlur ? 0.92 : 1 }}>
        {item.type === "video" ? (
          <Video
            src={item.src}
            startFrom={item.inFrame}
            endAt={item.outFrame}
            style={{ ...common, objectFit: portrait ? "contain" : "cover" }}
          />
        ) : (
          <Img src={item.src} style={{ ...common, objectFit: portrait ? "contain" : "cover" }} />
        )}
      </AbsoluteFill>

      {/* Neon glow wash */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 20% 15%, ${glowA} 0%, transparent 42%), radial-gradient(circle at 85% 70%, ${glowB} 0%, transparent 45%)`,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
}

function Scanlines({ opacity }: { opacity: number }) {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        opacity,
        background:
          "repeating-linear-gradient(to bottom, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.02) 2px, rgba(0,0,0,0.10) 4px, rgba(0,0,0,0.10) 6px)",
        mixBlendMode: "overlay",
      }}
    />
  );
}

function Grid({ opacity, accent }: { opacity: number; accent: string }) {
  const a = alpha(accent, opacity);
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        backgroundImage:
          `linear-gradient(${a} 1px, transparent 1px), linear-gradient(90deg, ${a} 1px, transparent 1px)`,
        backgroundSize: "64px 64px",
        mixBlendMode: "screen",
        opacity,
      }}
    />
  );
}

function Noise({ opacity }: { opacity: number }) {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <filter id={`noise-${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#noise-${seed})`} />
      </svg>
    </AbsoluteFill>
  );
}

function Vignette({ amount }: { amount: number }) {
  const a = clamp01(amount);
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background: `radial-gradient(circle at 50% 45%, rgba(0,0,0,0) 0%, rgba(0,0,0,${0.25 * a}) 55%, rgba(0,0,0,${0.9 * a}) 100%)`,
      }}
    />
  );
}

function getOverlapFrames(prev: MediaItem | null, next: MediaItem | null, crossfade: number): number {
  if (!prev || !next) return 0;
  const prevDur = getItemDuration(prev);
  const nextDur = getItemDuration(next);
  const maxSafe = Math.max(0, Math.floor(Math.min(prevDur, nextDur) / 2) - 1);
  return Math.min(crossfade, maxSafe);
}

function CornerBrackets({ accent, opacity }: { accent: string; opacity: number }) {
  const col = alpha(accent, opacity);
  const w = 26;
  const t = 2;
  const pad = 36;
  const corner: React.CSSProperties = {
    position: "absolute",
    width: w,
    height: w,
    borderColor: col,
    borderStyle: "solid",
    opacity,
    filter: `drop-shadow(0 0 14px ${alpha(accent, 0.35)})`,
  };
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ ...corner, left: pad, top: pad, borderLeftWidth: t, borderTopWidth: t }} />
      <div style={{ ...corner, right: pad, top: pad, borderRightWidth: t, borderTopWidth: t }} />
      <div style={{ ...corner, left: pad, bottom: pad, borderLeftWidth: t, borderBottomWidth: t }} />
      <div style={{ ...corner, right: pad, bottom: pad, borderRightWidth: t, borderBottomWidth: t }} />
    </AbsoluteFill>
  );
}

function HeaderHUD({
  brand,
  model,
  year,
  price,
  currency,
  videoLanguage,
  accent,
  accent2,
  reveal,
  portrait,
}: {
  brand: string;
  model: string;
  year: string;
  price: string;
  currency?: CurrencyCode;
  videoLanguage: VideoLanguage;
  accent: string;
  accent2: string;
  reveal: number; // 0..1
  portrait: boolean;
}) {
  const effectiveCurrency: CurrencyCode = currency ?? defaultCurrencyForLanguage(videoLanguage);
  const formatted =
    formatPrice(price, { language: videoLanguage, currency: effectiveCurrency, style: "currency" }) ??
    price;
  const padX = portrait ? 40 : 56;
  const top = portrait ? 40 : 44;
  const p = clamp01(reveal);
  const slide = (1 - p) * -30;
  const opacity = p;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: padX,
          right: padX,
          top,
          transform: `translateY(${slide}px)`,
          opacity,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 28,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "sans-serif",
              fontWeight: 800,
              fontSize: portrait ? uiFont(22) : uiFont(20),
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.70)",
            }}
          >
            {brand}
          </div>
          <div
            style={{
              marginTop: 10,
              fontFamily: "sans-serif",
              fontWeight: 900,
              fontSize: portrait ? uiFont(44) : uiFont(40),
              letterSpacing: "-0.02em",
              color: "#ffffff",
              textShadow: `0 0 26px ${alpha(accent2, 0.22)}`,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {model}
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div
            style={{
              fontFamily: "sans-serif",
              fontWeight: 800,
              fontSize: portrait ? uiFont(22) : uiFont(20),
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.62)",
            }}
          >
            {year}
          </div>
          <div
            style={{
              marginTop: 12,
              fontFamily: "sans-serif",
              fontWeight: 900,
              fontSize: portrait ? uiFont(36) : uiFont(34),
              letterSpacing: "-0.01em",
              color: accent,
              textShadow: `0 0 28px ${alpha(accent, 0.30)}`,
            }}
          >
            {formatted}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function GlitchFlash({ strength, accent }: { strength: number; accent: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame / fps) * 6;
  const flicker = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
  const a = clamp01(strength) * (0.12 + 0.18 * flicker);
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background: `linear-gradient(90deg, ${alpha(accent, a)} 0%, transparent 55%)`,
        mixBlendMode: "screen",
        opacity: a,
      }}
    />
  );
}

function OutroHUD({
  listing,
  accent,
  accent2,
  videoLanguage,
  portrait,
  ctaPhone,
}: {
  listing: ListingPayload;
  accent: string;
  accent2: string;
  videoLanguage: VideoLanguage;
  portrait: boolean;
  ctaPhone?: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, from: 0, to: 1, config: { damping: 22, mass: 0.7 } });
  const opacity = clamp01(enter);
  const pad = portrait ? 44 : 70;

  const rows = buildOutroGridRowsOnly(listing, videoLanguage, labelPackFor(videoLanguage)) ?? [];
  const maxRows = portrait ? 8 : 10;
  const rowsUsed = rows.slice(0, maxRows);

  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 40%, rgba(12,12,18,1) 0%, rgba(0,0,0,1) 70%)" }}>
      <Grid opacity={0.12} accent={accent2} />
      <Scanlines opacity={0.10} />
      <Noise opacity={0.10} />
      <Vignette amount={0.55} />

      <CornerBrackets accent={accent2} opacity={0.55} />

      <div
        style={{
          position: "absolute",
          left: pad,
          right: pad,
          top: portrait ? 90 : 96,
          opacity,
          transform: `translateY(${(1 - opacity) * 16}px)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 24 }}>
          <div style={{ fontFamily: "sans-serif", fontWeight: 900, fontSize: portrait ? uiFont(36) : uiFont(40), color: "#ffffff", letterSpacing: "-0.02em" }}>
            {listing.carBrand} {listing.carModel}
          </div>
          <div style={{ fontFamily: "sans-serif", fontWeight: 900, fontSize: portrait ? uiFont(22) : uiFont(22), color: alpha(accent, 0.95), letterSpacing: "0.22em", textTransform: "uppercase" }}>
            {listing.year ?? ""}
          </div>
        </div>

        <div style={{ marginTop: 26, display: "grid", gridTemplateColumns: portrait ? "1fr" : "1fr 1fr", gap: 12 }}>
          {rowsUsed.map((r) => (
            <div
              key={r.label}
              style={{
                borderRadius: 16,
                padding: "14px 16px",
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${alpha(accent2, 0.16)}`,
                boxShadow: `0 14px 44px rgba(0,0,0,0.42)`,
                backdropFilter: renderBlur("blur(16px)"),
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: uiFont(13), letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.62)" }}>
                {r.label}
              </div>
              <div style={{ fontFamily: "sans-serif", fontWeight: 900, fontSize: uiFont(16), color: "#ffffff" }}>
                {r.value}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: portrait ? 34 : 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
            padding: "16px 18px",
            borderRadius: 18,
            background: `linear-gradient(135deg, ${alpha(accent, 0.22)} 0%, rgba(255,255,255,0.06) 55%, ${alpha(accent2, 0.18)} 100%)`,
            border: `1px solid ${alpha(accent2, 0.22)}`,
          }}
        >
          <div style={{ fontFamily: "sans-serif", fontWeight: 900, fontSize: uiFont(14), letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.72)" }}>
            {labelPackFor(videoLanguage).contact}
          </div>
          <div style={{ fontFamily: "sans-serif", fontWeight: 900, fontSize: portrait ? uiFont(22) : uiFont(20), color: "#ffffff", textShadow: `0 0 22px ${alpha(accent2, 0.22)}` }}>
            {ctaPhone ?? (videoLanguage === "tr" ? "DM / Ara" : "DM / Call")}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function extractListingFromProps(props: PrestigeReelsProps, formattedPrice: string): ListingPayload {
  return {
    carBrand: props.carBrand,
    carModel: props.carModel,
    year: props.year,
    price: formattedPrice,
    ctaPhone: props.ctaPhone,
    km: props.km,
    motor: props.motor,
    renk: props.renk,
    vites: props.vites,
    yakit: props.yakit,
    kasa: props.kasa,
    seri: props.seri,
    aracDurumu: props.aracDurumu,
    motorGucu: props.motorGucu,
    motorHacmi: props.motorHacmi,
    cekis: props.cekis,
    garanti: props.garanti,
    agirHasarKayitli: props.agirHasarKayitli,
    plaka: props.plaka,
    ilanTarihi: props.ilanTarihi,
  } as ListingPayload;
}

function VariantInfoPanel({
  item,
  props,
  formattedPrice,
  videoLanguage,
  accent,
  accent2,
  reveal,
  portrait,
  index,
}: {
  item: MediaItem;
  props: PrestigeReelsProps;
  formattedPrice: string;
  videoLanguage: VideoLanguage;
  accent: string;
  accent2: string;
  reveal: number;
  portrait: boolean;
  index: number;
}) {
  const variant = item.sceneVariant ?? "full_bleed";
  const L = labelPackFor(videoLanguage);
  const tv = translateListingValuesForVideo(videoLanguage, extractListingFromProps(props, formattedPrice));

  const groups = (() => {
    const usage = [
      tv.km ? { k: L.labels.km, v: tv.km } : null,
      tv.vites ? { k: L.labels.gearbox, v: tv.vites } : null,
      tv.yakit ? { k: L.labels.fuel, v: tv.yakit } : null,
      tv.kasa ? { k: L.labels.body, v: tv.kasa } : null,
    ].filter(Boolean) as { k: string; v: string }[];

    const engine = [
      tv.motorGucu ? { k: L.labels.enginePower, v: tv.motorGucu } : null,
      tv.motorHacmi ? { k: L.labels.engineDisplacement, v: tv.motorHacmi } : null,
      tv.cekis ? { k: L.labels.drivetrain, v: tv.cekis } : null,
      tv.motor ? { k: L.engineGeneric, v: tv.motor } : null,
    ].filter(Boolean) as { k: string; v: string }[];

    const meta = [
      tv.aracDurumu ? { k: L.vehicleCondition, v: tv.aracDurumu } : null,
      tv.garanti ? { k: L.warranty, v: tv.garanti } : null,
      tv.agirHasarKayitli ? { k: L.heavyDamage, v: tv.agirHasarKayitli } : null,
      tv.ilanTarihi ? { k: L.listingDate, v: tv.ilanTarihi } : null,
      tv.plaka ? { k: L.plate, v: tv.plaka } : null,
      tv.renk ? { k: L.labels.color, v: tv.renk } : null,
    ].filter(Boolean) as { k: string; v: string }[];

    const price = [
      { k: L.labels.price, v: formattedPrice },
      tv.ctaPhone ? { k: L.phone, v: tv.ctaPhone } : null,
    ].filter(Boolean) as { k: string; v: string }[];

    // map common variants to different content blocks; fall back to rotation
    if (variant === "price_reveal") return price;
    if (variant === "listing_panel" || variant === "stats_grid") return usage.length ? usage : price;
    if (variant === "split_specs" || variant === "feature_hero") return engine.length ? engine : usage;
    if (variant === "floating_card") return meta.length ? meta : usage;

    const rotation = [usage, engine, meta, price].filter((g) => g.length);
    return rotation.length ? rotation[index % rotation.length]! : price;
  })();

  if (!groups.length) return null;

  const used = groups.slice(0, portrait ? 3 : 4);
  const p = clamp01(reveal);
  const pad = portrait ? 38 : 54;
  const bottom = portrait ? 56 : 44;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: 1 }}>
      <div
        style={{
          position: "absolute",
          left: pad,
          right: pad,
          bottom,
          display: "grid",
          gridTemplateColumns: portrait ? "1fr" : `repeat(${used.length}, minmax(0, 1fr))`,
          gap: 10,
        }}
      >
        {used.map((r) => (
          <div
            key={r.k}
            style={{
              borderRadius: 16,
              padding: "12px 14px",
              background: "rgba(0,0,0,0.62)",
              border: `1px solid ${alpha(accent2, 0.22)}`,
              backdropFilter: renderBlur("blur(14px)"),
              boxShadow: `0 18px 70px rgba(0,0,0,0.42)`,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div style={{ fontFamily: "sans-serif", fontWeight: 900, letterSpacing: "0.18em", fontSize: uiFont(11), color: "rgba(255,255,255,0.60)", textTransform: "uppercase" }}>
              {r.k}
            </div>
            <div style={{ marginTop: 8, fontFamily: "sans-serif", fontWeight: 900, fontSize: uiFont(16), color: "#ffffff", textShadow: `0 0 18px ${alpha(accent, 0.20)}` }}>
              {r.v}
            </div>
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${alpha(accent, 0.10)} 0%, transparent 55%, ${alpha(accent2, 0.10)} 100%)` }} />
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(0,0,0,0.18) 0%, transparent 40%, rgba(0,0,0,0.22) 100%)` }} />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

function TransitionOverlay({
  localFrame,
  duration,
  overlapIn,
  overlapOut,
  accent,
  accent2,
  chroma,
}: {
  localFrame: number;
  duration: number;
  overlapIn: number;
  overlapOut: number;
  accent: string;
  accent2: string;
  chroma: number;
}) {
  const enter = overlapIn > 0 ? clamp01(localFrame / overlapIn) : 1;
  const exit = overlapOut > 0 ? clamp01((localFrame - (duration - overlapOut)) / overlapOut) : 0;
  const pulse = Math.max(0, 1 - Math.abs(enter - 0.5) * 2);
  const exitPulse = Math.max(0, 1 - Math.abs(exit - 0.5) * 2);
  const a = 0.22 * pulse;
  const b = 0.22 * exitPulse;
  const blur = (1 - enter) * 16 + exit * 12;
  const shift = (1 - enter) * chroma + exit * chroma;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 30% 25%, ${alpha(accent2, a)} 0%, transparent 55%), radial-gradient(circle at 80% 70%, ${alpha(accent, b)} 0%, transparent 60%)`,
          mixBlendMode: "screen",
          filter: `blur(${blur.toFixed(1)}px)`,
        }}
      />
      {/* pseudo chromatic split by shifting two translucent layers */}
      <AbsoluteFill
        style={{
          transform: `translateX(${shift.toFixed(1)}px)`,
          opacity: 0.22 * pulse,
          background: alpha(accent2, 0.22),
          mixBlendMode: "screen",
        }}
      />
      <AbsoluteFill
        style={{
          transform: `translateX(${-shift.toFixed(1)}px)`,
          opacity: 0.16 * pulse,
          background: alpha(accent, 0.20),
          mixBlendMode: "screen",
        }}
      />
    </AbsoluteFill>
  );
}

function Shot({
  item,
  index,
  items,
  preset,
  props,
  formattedPrice,
  portrait,
}: {
  item: MediaItem;
  index: number;
  items: MediaItem[];
  preset: { crossfadeFrames: number };
  props: PrestigeReelsProps;
  formattedPrice: string;
  portrait: boolean;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const startFrame = getItemStartFrame(items, index, preset.crossfadeFrames);
  const duration = getItemDuration(item);
  const endFrame = startFrame + duration;
  const localFrame = frame - startFrame;
  if (frame < startFrame || frame >= endFrame) return null;

  const overlapIn = getOverlapFrames(items[index - 1] ?? null, item, preset.crossfadeFrames);
  const overlapOut = getOverlapFrames(item, items[index + 1] ?? null, preset.crossfadeFrames);
  const opacity = (() => {
    if (overlapIn <= 0 && overlapOut <= 0) return 1;
    if (overlapIn <= 0) {
      return interpolate(localFrame, [0, duration - overlapOut, duration], [1, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    }
    if (overlapOut <= 0) {
      return interpolate(localFrame, [0, overlapIn, duration], [0, 1, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    }
    return interpolate(localFrame, [0, overlapIn, duration - overlapOut, duration], [0, 1, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  })();

  if (opacity <= 0) return null;

  const style = props.reelStyle ?? "cinematic";
  const neon = NEON_STYLE[style];

  const enter = spring({ frame: localFrame, fps, from: 0, to: 1, config: { damping: 16, mass: 0.6 } });
  const settle = clamp01(enter);
  const reveal = Math.min(1, settle + 0.08);

  const zoom = 1.02 + 0.04 * (1 - Math.cos((localFrame / Math.max(1, duration)) * Math.PI)) * (style === "dynamic" ? 1.15 : 0.9);
  const tilt = (style === "dynamic" ? 1 : 0.6) * Math.sin((localFrame / fps) * 0.9) * 0.6;
  const hue = style === "dynamic" ? `hue-rotate(${Math.sin((frame / fps) * 0.7) * 5}deg)` : "";

  const cat = item.categoryId
    ? resolveShotCategoryLabel(props.videoLanguage ?? "tr", item.categoryId, item.categoryLabel ?? item.categoryLabelEn)
    : (item.categoryLabel ?? item.categoryLabelEn)?.trim();
  const catUi = props.showShotLabels ? cat : undefined;

  return (
    <AbsoluteFill style={{ opacity }}>
      <AbsoluteFill style={{ transform: `scale(${zoom.toFixed(4)}) rotate(${tilt.toFixed(3)}deg)`, filter: `contrast(1.15) saturate(1.05) brightness(0.92) ${hue}` }}>
        <Background item={item} portrait={portrait} colorA={neon.accent} colorB={neon.accent2} />
      </AbsoluteFill>

      <Grid opacity={neon.gridOpacity} accent={neon.accent2} />
      <Scanlines opacity={neon.scanOpacity} />
      <Noise opacity={neon.noise} />
      <Vignette amount={neon.vignette} />

      <TransitionOverlay
        localFrame={localFrame}
        duration={duration}
        overlapIn={overlapIn}
        overlapOut={overlapOut}
        accent={neon.accent}
        accent2={neon.accent2}
        chroma={neon.chroma}
      />
      <GlitchFlash strength={style === "dynamic" ? 1 : 0.7} accent={neon.accent2} />

      <CornerBrackets accent={neon.accent2} opacity={0.55 + 0.25 * neon.hudDensity} />

      <HeaderHUD
        brand={props.carBrand}
        model={props.carModel}
        year={props.year}
        price={formattedPrice}
        currency={props.currency}
        videoLanguage={props.videoLanguage ?? "tr"}
        accent={neon.accent}
        accent2={neon.accent2}
        reveal={reveal}
        portrait={portrait}
      />

      <VariantInfoPanel
        item={item}
        props={props}
        formattedPrice={formattedPrice}
        videoLanguage={props.videoLanguage ?? "tr"}
        accent={neon.accent}
        accent2={neon.accent2}
        reveal={reveal}
        portrait={portrait}
        index={index}
      />

      {/* voiceover for this shot (if provided) */}
      {item.audioSrc ? (
        <Sequence from={0} durationInFrames={duration}>
          <Audio src={item.audioSrc} volume={1} />
        </Sequence>
      ) : null}

      {/* outro panel trigger is handled by parent */}
      {props.showShotLabels && catUi ? (
        <div
          style={{
            position: "absolute",
            left: portrait ? 42 : 64,
            bottom: portrait ? 42 : 44,
            padding: "10px 12px",
            borderRadius: 14,
            background: "rgba(0,0,0,0.45)",
            border: `1px solid ${alpha(neon.accent2, 0.22)}`,
            backdropFilter: renderBlur("blur(14px)"),
            fontFamily: "sans-serif",
            fontWeight: 900,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            fontSize: uiFont(12),
            color: "rgba(255,255,255,0.86)",
          }}
        >
          {catUi}
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

export const NeonReels: React.FC<PrestigeReelsProps> = (props) => {
  const {
    mediaItems,
    bgmSrc,
    bgmVolume = 0.45,
    aspectRatio,
    layout = "landscape",
    outroFrames = 90,
    reelStyle = "cinematic",
    videoLanguage = "tr",
    voiceoverSync = false,
  } = props;

  const effectiveLayout: "portrait" | "landscape" =
    aspectRatio ? aspectRatioToLayout(aspectRatio) : layout;
  const portrait = effectiveLayout === "portrait";
  const basePreset = STYLE_PRESETS[reelStyle];
  const preset = {
    ...basePreset,
    crossfadeFrames: voiceoverSync ? 0 : basePreset.crossfadeFrames,
  };

  const safeOutroFrames = Math.max(0, outroFrames);
  const totalFrames = getTotalFrames(mediaItems, { outroFrames: safeOutroFrames, crossfadeFrames: preset.crossfadeFrames });
  const outroStartFrame = totalFrames - safeOutroFrames;

  const effectiveCurrency: CurrencyCode = props.currency ?? defaultCurrencyForLanguage(videoLanguage);
  const formattedPrice =
    formatPrice(props.price, { language: videoLanguage, currency: effectiveCurrency, style: "currency" }) ??
    props.price;

  const listing = useMemo(() => extractListingFromProps(props, formattedPrice), [props, formattedPrice]);

  const frame = useCurrentFrame();
  const bgmFade = (() => {
    const fadeIn = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
    const fadeOut = interpolate(frame, [Math.max(0, totalFrames - 24), totalFrames], [1, 0], { extrapolateLeft: "clamp" });
    return Math.min(fadeIn, fadeOut);
  })();

  const voiceoverActive = (() => {
    for (let i = 0; i < mediaItems.length; i++) {
      const it = mediaItems[i];
      if (!it.audioSrc) continue;
      const from = getItemStartFrame(mediaItems, i, preset.crossfadeFrames);
      const dur = getItemDuration(it);
      if (frame >= from && frame < from + dur) return true;
    }
    return false;
  })();

  const bgmDuck = voiceoverActive ? 0.18 : 1;
  const bgmVol = Math.max(0, Math.min(1, bgmVolume)) * bgmFade * bgmDuck;

  const neon = NEON_STYLE[reelStyle];

  return (
    <AbsoluteFill style={{ background: "#000000" }}>
      {/* shots */}
      {mediaItems.map((item, idx) => (
        <Shot
          key={idx}
          item={item}
          index={idx}
          items={mediaItems}
          preset={preset}
          props={props}
          formattedPrice={formattedPrice}
          portrait={portrait}
        />
      ))}

      {/* global music */}
      {bgmSrc ? <Audio src={bgmSrc} volume={bgmVol} /> : null}

      {/* outro */}
      {safeOutroFrames > 0 ? (
        <Sequence from={outroStartFrame} durationInFrames={safeOutroFrames}>
          <OutroHUD
            listing={listing}
            accent={neon.accent}
            accent2={neon.accent2}
            videoLanguage={videoLanguage}
            portrait={portrait}
            ctaPhone={props.ctaPhone}
          />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};

