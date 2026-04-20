import type { LanguageCode } from "@/lib/languages";
import type { ListingPayload } from "@/lib/listingPayload";

export type SpecCategory = "engine" | "cockpit" | "wheel" | "dimensions";

export interface SpecRow {
  label: string;
  value: string;
  barPct?: number;
}

type SpecBlock = { title: string; rows: SpecRow[] };

function t(lang: LanguageCode) {
  const base = {
    engine: { tr: "MOTOR & SÜRÜŞ", en: "ENGINE & DRIVE" },
    cockpit:{ tr: "İÇ MEKAN",       en: "INTERIOR" },
    wheel:  { tr: "LASTİK & JANT",  en: "WHEELS & TYRES" },
    dimensions:{ tr: "BOYUTLAR",    en: "DIMENSIONS" },
    labels: {
      motor: { tr: "Motor", en: "Engine" },
      enginePower: { tr: "Motor Gücü", en: "Power" },
      engineDisplacement: { tr: "Motor Hacmi", en: "Displacement" },
      drivetrain: { tr: "Çekiş", en: "Drivetrain" },
      fuel: { tr: "Yakıt", en: "Fuel" },
      gearbox: { tr: "Vites", en: "Gearbox" },
      km: { tr: "KM", en: "Mileage" },
      body: { tr: "Kasa", en: "Body" },
      color: { tr: "Renk", en: "Color" },
      condition: { tr: "Araç Durumu", en: "Condition" },
      warranty: { tr: "Garanti", en: "Warranty" },
      heavyDamage: { tr: "Ağır Hasar", en: "Accident record" },
      plate: { tr: "Plaka", en: "Plate" },
      listingDate: { tr: "İlan Tarihi", en: "Listing date" },
    },
  } as const;

  const pick = <T extends { tr: string; en: string }>(o: T) => (lang === "tr" ? o.tr : o.en);
  return {
    titles: {
      engine: pick(base.engine),
      cockpit: pick(base.cockpit),
      wheel: pick(base.wheel),
      dimensions: pick(base.dimensions),
    },
    labels: Object.fromEntries(
      Object.entries(base.labels).map(([k, v]) => [k, pick(v as { tr: string; en: string })])
    ) as Record<keyof typeof base.labels, string>,
  };
}

function row(label: string, value?: string): SpecRow | null {
  const v = value?.trim();
  if (!v) return null;
  return { label, value: v };
}

/**
 * Spec table data derived from the seller listing.
 * IMPORTANT: No mock/speculation — if the user didn't provide it, we don't show it.
 */
export function getSpecTableDataFromListing(
  lang: LanguageCode,
  listing: ListingPayload,
): Record<SpecCategory, SpecBlock> {
  const L = t(lang);

  const engineRows = ([
    row(L.labels.motor, listing.motor),
    row(L.labels.enginePower, listing.motorGucu),
    row(L.labels.engineDisplacement, listing.motorHacmi),
    row(L.labels.drivetrain, listing.cekis),
    row(L.labels.fuel, listing.yakit),
    row(L.labels.gearbox, listing.vites),
    row(L.labels.km, listing.km),
  ].filter(Boolean) as SpecRow[]);

  const cockpitRows = ([
    row(L.labels.body, listing.kasa),
    row(L.labels.color, listing.renk),
    row(L.labels.condition, listing.aracDurumu),
    row(L.labels.warranty, listing.garanti),
  ].filter(Boolean) as SpecRow[]);

  // wheel/dimensions require dedicated fields we don't currently collect — keep empty.
  const wheelRows: SpecRow[] = [];
  const dimRows: SpecRow[] = [];

  return {
    engine: { title: L.titles.engine, rows: engineRows },
    cockpit: { title: L.titles.cockpit, rows: cockpitRows },
    wheel: { title: L.titles.wheel, rows: wheelRows },
    dimensions: { title: L.titles.dimensions, rows: dimRows },
  };
}
