import type { LanguageCode } from "@/lib/languages";

/** Demo formu / render ile uyumlu ilan alanları */
export type ListingPayload = {
  carBrand?: string;
  carModel?: string;
  year?: string;
  price?: string;
  ctaPhone?: string;
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
};

function trimVal(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim();
}

export function parseListingPayload(raw: unknown): ListingPayload {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const keys: (keyof ListingPayload)[] = [
    "carBrand", "carModel", "year", "price", "ctaPhone", "km", "motor", "renk", "vites", "yakit",
    "kasa", "seri", "aracDurumu", "motorGucu", "motorHacmi", "cekis", "garanti", "agirHasarKayitli",
    "plaka", "ilanTarihi",
  ];
  const out: ListingPayload = {};
  for (const k of keys) {
    const t = trimVal(o[k]);
    if (t) out[k] = t;
  }
  return out;
}

export function hasAnyListingData(listing: ListingPayload): boolean {
  return Object.keys(listing).length > 0;
}

/** OpenAI promptuna giden blok — satıcı verisi + kurgu talimatı */
export function buildListingPromptSection(listing: ListingPayload): string {
  if (!hasAnyListingData(listing)) return "";

  const lines: string[] = [];
  const add = (key: string, val: string | undefined) => {
    if (val?.trim()) lines.push(`- ${key}: ${val.trim()}`);
  };

  add("carBrand", listing.carBrand);
  add("carModel", listing.carModel);
  add("year", listing.year);
  add("price", listing.price);
  add("ctaPhone", listing.ctaPhone);
  add("km", listing.km);
  add("motor", listing.motor);
  add("motorGucu_hp_nm", listing.motorGucu);
  add("motorHacmi_cc", listing.motorHacmi);
  add("renk", listing.renk);
  add("vites", listing.vites);
  add("yakit", listing.yakit);
  add("kasa", listing.kasa);
  add("seri", listing.seri);
  add("aracDurumu", listing.aracDurumu);
  add("cekis", listing.cekis);
  add("garanti", listing.garanti);
  add("agirHasarKayitli", listing.agirHasarKayitli);
  add("plaka", listing.plaka);
  add("ilanTarihi", listing.ilanTarihi);

  return `
━━ SELLER LISTING DATA (AUTHORITATIVE TEXT) ━━
The following fields were entered by the seller. Treat them as ground truth for on-screen text.
Do NOT invent values for fields not listed below. Empty/missing seller fields must NOT appear as fabricated text.

${lines.join("\n")}

TASK L — USE DATA WITHOUT “SAME INFO ON LOOP”:
IMPORTANT: The rendered video ends with an OUTRO card that lists ALL seller fields in one place. The main storyboard must NOT feel like the same KM/price/spec block repeated shot after shot.

1) COVERAGE (soft): Aim for each non-empty field to appear in the main edit OR be clearly implied by one dedicated shot — but prioritize **visual variety and pacing** over re-showing tables.
2) ANTI-REPETITION (hard — follow strictly):
   • Identity (brand/model/year/seri): at most **two** shots where they are the primary focus (e.g. hook + one editorial). Do not restate full identity in every shot.
   • Price: at most **two** shots that foreground price (e.g. one price_reveal + optionally one other). Do not put big price text in back-to-back shots.
   • “Usage” cluster (km, vites, yakit, kasa, renk): use **at most ONE** of stats_grid / listing_panel / card_panel for that cluster — not multiple stats-style shots in a row with the same four numbers.
   • Motor cluster (motor, motorGucu, motorHacmi, cekis): **one** split_specs OR card_panel OR side_table is enough unless photos strongly suggest a second engineering angle.
   • Legal/meta (garanti, plaka, ilanTarihi, agirHasarKayitli, aracDurumu): **one** floating_card is enough.
3) Fill the rest with **non-table** variants: callout, spotlight, letter_box, duo_split, trio_mosaic, split_band — so the edit alternates emotion, detail, composition — not endless spec panels.
4) comment_tr: vary tone (hook vs detail vs mood); do not paste the same spec sentence every shot.
5) Voiceover (if enabled): mention each major fact **at most once** across the whole sequence; never re-read price + KM in consecutive lines.
`;
}

/** Outro / özet satırları — etiketler video dili ile */
const OUTRO_EXTRA: Record<
  LanguageCode,
  { seri: string; motorGen: string; phone: string; garanti: string; agirHasar: string; plaka: string; ilanTarihi: string; brand: string; model: string }
> = {
  tr: {
    seri: "SERİ",
    motorGen: "MOTOR",
    phone: "TELEFON",
    garanti: "GARANTİ",
    agirHasar: "AĞIR HASAR",
    plaka: "PLAKA",
    ilanTarihi: "İLAN TARİHİ",
    brand: "MARKA",
    model: "MODEL",
  },
  en: {
    seri: "SERIES",
    motorGen: "ENGINE",
    phone: "PHONE",
    garanti: "WARRANTY",
    agirHasar: "ACCIDENT RECORD",
    plaka: "PLATE",
    ilanTarihi: "LISTING DATE",
    brand: "MAKE",
    model: "MODEL",
  },
  es: {
    seri: "SERIE",
    motorGen: "MOTOR",
    phone: "TELÉFONO",
    garanti: "GARANTÍA",
    agirHasar: "SINIESTRO GRAVE",
    plaka: "MATRÍCULA",
    ilanTarihi: "FECHA DEL ANUNCIO",
    brand: "MARCA",
    model: "MODELO",
  },
  fr: {
    seri: "SÉRIE",
    motorGen: "MOTEUR",
    phone: "TÉLÉPHONE",
    garanti: "GARANTIE",
    agirHasar: "SINISTRE LOURD",
    plaka: "PLAQUE",
    ilanTarihi: "DATE DE L’ANNONCE",
    brand: "MARQUE",
    model: "MODÈLE",
  },
  de: {
    seri: "BAUREIHE",
    motorGen: "MOTOR",
    phone: "TELEFON",
    garanti: "GARANTIE",
    agirHasar: "SCHWERER SCHADEN",
    plaka: "KENNZEICHEN",
    ilanTarihi: "ANZEIGEDATUM",
    brand: "MARKE",
    model: "MODELL",
  },
  it: {
    seri: "SERIE",
    motorGen: "MOTORE",
    phone: "TELEFONO",
    garanti: "GARANZIA",
    agirHasar: "DANNO GRAVE",
    plaka: "TARGA",
    ilanTarihi: "DATA ANNUNCIO",
    brand: "MARCA",
    model: "MODELLO",
  },
  ru: {
    seri: "СЕРИЯ",
    motorGen: "ДВИГАТЕЛЬ",
    phone: "ТЕЛЕФОН",
    garanti: "ГАРАНТИЯ",
    agirHasar: "ТЯЖЁЛОЕ ДТП",
    plaka: "НОМЕР",
    ilanTarihi: "ДАТА ОБЪЯВЛЕНИЯ",
    brand: "МАРКА",
    model: "МОДЕЛЬ",
  },
  pt: {
    seri: "SÉRIE",
    motorGen: "MOTOR",
    phone: "TELEFONE",
    garanti: "GARANTIA",
    agirHasar: "SINISTRO GRAVE",
    plaka: "MATRÍCULA",
    ilanTarihi: "DATA DO ANÚNCIO",
    brand: "MARCA",
    model: "MODELO",
  },
};

type LabelPack = {
  modelYear: string;
  vehicleCondition: string;
  salePrice: string;
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
};

/** VIDEO_I18N ile aynı anahtarlar — PrestigeReels’ten kopya tutmamak için minimal import yok; çağıran geçer */
export function buildOutroListingRows(
  listing: ListingPayload,
  lang: LanguageCode,
  i18n: LabelPack,
): { label: string; value: string }[] {
  const ex = OUTRO_EXTRA[lang] ?? OUTRO_EXTRA.tr;
  const rows: { label: string; value: string }[] = [];

  const push = (label: string, val?: string) => {
    const t = val?.trim();
    if (t) rows.push({ label, value: t });
  };

  push(ex.brand, listing.carBrand);
  push(ex.model, listing.carModel);
  push(i18n.modelYear, listing.year);
  push(i18n.salePrice, listing.price);
  push(ex.seri, listing.seri);
  push(i18n.labels.km, listing.km);
  push(ex.motorGen, listing.motor);
  push(i18n.labels.enginePower, listing.motorGucu);
  push(i18n.labels.engineDisplacement, listing.motorHacmi);
  push(i18n.labels.color, listing.renk);
  push(i18n.labels.gearbox, listing.vites);
  push(i18n.labels.fuel, listing.yakit);
  push(i18n.labels.body, listing.kasa);
  push(i18n.vehicleCondition, listing.aracDurumu);
  push(i18n.labels.drivetrain, listing.cekis);
  push(ex.garanti, listing.garanti);
  push(ex.agirHasar, listing.agirHasarKayitli);
  push(ex.plaka, listing.plaka);
  push(ex.ilanTarihi, listing.ilanTarihi);
  push(ex.phone, listing.ctaPhone);

  return rows;
}

/** Üst başlıkta + CTA’da gösterilenler — alttaki ızgarada tekrar etme */
const OUTRO_GRID_SKIP = new Set<keyof ListingPayload>([
  "carBrand", "carModel", "year", "price", "ctaPhone",
]);

export function buildOutroGridRowsOnly(
  listing: ListingPayload,
  lang: LanguageCode,
  i18n: LabelPack,
): { label: string; value: string }[] {
  const ex = OUTRO_EXTRA[lang] ?? OUTRO_EXTRA.tr;
  const rows: { label: string; value: string }[] = [];
  const push = (key: keyof ListingPayload, label: string) => {
    if (OUTRO_GRID_SKIP.has(key)) return;
    const v = listing[key]?.trim();
    if (v) rows.push({ label, value: v });
  };

  push("seri", ex.seri);
  push("km", i18n.labels.km);
  push("motor", ex.motorGen);
  push("motorGucu", i18n.labels.enginePower);
  push("motorHacmi", i18n.labels.engineDisplacement);
  push("renk", i18n.labels.color);
  push("vites", i18n.labels.gearbox);
  push("yakit", i18n.labels.fuel);
  push("kasa", i18n.labels.body);
  push("aracDurumu", i18n.vehicleCondition);
  push("cekis", i18n.labels.drivetrain);
  push("garanti", ex.garanti);
  push("agirHasarKayitli", ex.agirHasar);
  push("plaka", ex.plaka);
  push("ilanTarihi", ex.ilanTarihi);

  return rows;
}
