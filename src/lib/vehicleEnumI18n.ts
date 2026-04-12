import type { LanguageCode } from "@/lib/languages";
import type { ListingPayload } from "@/lib/listingPayload";

/** Türkçe ilan metinlerini çeviri anahtarına indirger (İ/ı, ş→s, "4 x 4" → "4x4"). */
export function normKey(s: string): string {
  return s
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ")
    .replace(/&/g, " ve ")
    .replace(/\b(\d)\s*x\s*(\d)\b/gi, "$1x$2")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/\u0307/g, "");
}

export type VehicleEnumKind =
  | "gearbox"
  | "fuel"
  | "drivetrain"
  | "body"
  | "condition"
  | "color";

export function translateEnumValue(
  lang: LanguageCode,
  kind: VehicleEnumKind,
  value?: string
): string | undefined {
  const v = value?.trim();
  if (!v) return value;
  if (lang === "tr") return value;

  const k = normKey(v);

  const map = (dict: Record<string, Partial<Record<LanguageCode, string>>>): string | undefined =>
    dict[k]?.[lang] ?? undefined;

  const gearbox = map({
    manuel: { en: "Manual", es: "Manual", fr: "Manuelle", de: "Schaltgetriebe", it: "Manuale", ru: "Механика", pt: "Manual" },
    otomatik: { en: "Automatic", es: "Automático", fr: "Automatique", de: "Automatik", it: "Automatico", ru: "Автомат", pt: "Automático" },
    "yari otomatik": { en: "Semi-automatic", es: "Semiautomático", fr: "Semi-automatique", de: "Halbautomatik", it: "Semiautomatico", ru: "Робот", pt: "Semiautomático" },
  });

  const fuel = map({
    benzin: { en: "Petrol", es: "Gasolina", fr: "Essence", de: "Benzin", it: "Benzina", ru: "Бензин", pt: "Gasolina" },
    dizel: { en: "Diesel", es: "Diésel", fr: "Diesel", de: "Diesel", it: "Diesel", ru: "Дизель", pt: "Diesel" },
    lpg: { en: "LPG", es: "GLP", fr: "GPL", de: "LPG", it: "GPL", ru: "ГБО", pt: "GLP" },
    "benzin & lpg": { en: "Petrol & LPG", es: "Gasolina y GLP", fr: "Essence & GPL", de: "Benzin & LPG", it: "Benzina & GPL", ru: "Бензин + ГБО", pt: "Gasolina & GLP" },
    elektrik: { en: "Electric", es: "Eléctrico", fr: "Électrique", de: "Elektro", it: "Elettrico", ru: "Электро", pt: "Elétrico" },
    hibrit: { en: "Hybrid", es: "Híbrido", fr: "Hybride", de: "Hybrid", it: "Ibrido", ru: "Гибрид", pt: "Híbrido" },
  });

  const drivetrain = map({
    "onden cekis": { en: "FWD", es: "Tracción delantera", fr: "Traction avant", de: "Frontantrieb", it: "Trazione anteriore", ru: "Передний привод", pt: "Tração dianteira" },
    "arkadan itis": { en: "RWD", es: "Tracción trasera", fr: "Propulsion", de: "Heckantrieb", it: "Trazione posteriore", ru: "Задний привод", pt: "Tração traseira" },
    "4x4": { en: "4x4", es: "4x4", fr: "4x4", de: "4x4", it: "4x4", ru: "4x4", pt: "4x4" },
    awd: { en: "AWD", es: "AWD", fr: "AWD", de: "AWD", it: "AWD", ru: "AWD", pt: "AWD" },
  });

  const condition = map({
    "ikinci el": { en: "Used", es: "De segunda mano", fr: "Occasion", de: "Gebraucht", it: "Usato", ru: "С пробегом", pt: "Usado" },
    sifir: { en: "New", es: "Nuevo", fr: "Neuf", de: "Neu", it: "Nuovo", ru: "Новый", pt: "Novo" },
  });

  const body = map({
    sedan: { en: "Sedan", es: "Sedán", fr: "Berline", de: "Limousine", it: "Berlina", ru: "Седан", pt: "Sedã" },
    hatchback: { en: "Hatchback", es: "Hatchback", fr: "Compacte", de: "Kompakt", it: "Hatchback", ru: "Хэтчбек", pt: "Hatchback" },
    suv: { en: "SUV", es: "SUV", fr: "SUV", de: "SUV", it: "SUV", ru: "SUV", pt: "SUV" },
    coupe: { en: "Coupe", es: "Coupé", fr: "Coupé", de: "Coupé", it: "Coupé", ru: "Купе", pt: "Coupé" },
    cabrio: { en: "Convertible", es: "Cabrio", fr: "Cabriolet", de: "Cabrio", it: "Cabrio", ru: "Кабриолет", pt: "Conversível" },
    "station wagon": { en: "Wagon", es: "Familiar", fr: "Break", de: "Kombi", it: "Station wagon", ru: "Универсал", pt: "Perua" },
  });

  const color = map({
    siyah: { en: "Black", es: "Negro", fr: "Noir", de: "Schwarz", it: "Nero", ru: "Чёрный", pt: "Preto" },
    beyaz: { en: "White", es: "Blanco", fr: "Blanc", de: "Weiß", it: "Bianco", ru: "Белый", pt: "Branco" },
    gri: { en: "Grey", es: "Gris", fr: "Gris", de: "Grau", it: "Grigio", ru: "Серый", pt: "Cinza" },
    gumus: { en: "Silver", es: "Plateado", fr: "Argent", de: "Silber", it: "Argento", ru: "Серебристый", pt: "Prata" },
    kirmizi: { en: "Red", es: "Rojo", fr: "Rouge", de: "Rot", it: "Rosso", ru: "Красный", pt: "Vermelho" },
    mavi: { en: "Blue", es: "Azul", fr: "Bleu", de: "Blau", it: "Blu", ru: "Синий", pt: "Azul" },
  });

  const out =
    kind === "gearbox" ? gearbox :
    kind === "fuel" ? fuel :
    kind === "drivetrain" ? drivetrain :
    kind === "condition" ? condition :
    kind === "body" ? body :
    kind === "color" ? color :
    undefined;

  return out ?? value;
}

export function translateYesNo(lang: LanguageCode, value?: string): string | undefined {
  const v = value?.trim();
  if (!v) return value;
  if (lang === "tr") return value;
  const k = normKey(v);
  const dict: Record<string, Partial<Record<LanguageCode, string>>> = {
    evet: { en: "Yes", es: "Sí", fr: "Oui", de: "Ja", it: "Sì", ru: "Да", pt: "Sim" },
    hayir: { en: "No", es: "No", fr: "Non", de: "Nein", it: "No", ru: "Нет", pt: "Não" },
    bilinmiyor: { en: "Unknown", es: "Desconocido", fr: "Inconnu", de: "Unbekannt", it: "Sconosciuto", ru: "Неизвестно", pt: "Desconhecido" },
  };
  return dict[k]?.[lang] ?? value;
}

/** Outro ve özet satırlarında gösterim — etiketler zaten i18n, değerler kanonik TR ise çevrilir. */
export function translateListingValuesForVideo(lang: LanguageCode, listing: ListingPayload): ListingPayload {
  if (lang === "tr") return { ...listing };
  const te = (v: string | undefined, kind: VehicleEnumKind) =>
    v?.trim() ? translateEnumValue(lang, kind, v) ?? v : v;
  const yn = (v: string | undefined) =>
    v?.trim() ? translateYesNo(lang, v) ?? v : v;
  return {
    ...listing,
    vites: te(listing.vites, "gearbox"),
    yakit: te(listing.yakit, "fuel"),
    cekis: te(listing.cekis, "drivetrain"),
    kasa: te(listing.kasa, "body"),
    aracDurumu: te(listing.aracDurumu, "condition"),
    renk: te(listing.renk, "color"),
    garanti: yn(listing.garanti),
    agirHasarKayitli: yn(listing.agirHasarKayitli),
  };
}
