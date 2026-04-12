import type { LanguageCode } from "@/lib/languages";

export type SpecCategory = "engine" | "cockpit" | "wheel" | "dimensions";

export interface SpecRow {
  label: string;
  value: string;
  barPct?: number;
}

const SPEC_DATA_TR: Record<SpecCategory, { title: string; rows: SpecRow[] }> = {
  engine: {
    title: "MOTOR PERFORMANSI",
    rows: [
      { label: "Motor", value: "2.0L TwinPower Turbo" },
      { label: "Güç", value: "190 HP", barPct: 0.72 },
      { label: "Tork", value: "400 Nm", barPct: 0.8 },
      { label: "0–100 km/s", value: "7.2 sn", barPct: 0.56 },
      { label: "Azami Hız", value: "235 km/h", barPct: 0.78 },
    ],
  },
  cockpit: {
    title: "İÇ MEKAN ÖZELLİKLERİ",
    rows: [
      { label: "Panoramik Cam Tavan", value: "✓" },
      { label: "Isıtmalı & Havalandırmalı Koltuk", value: "✓" },
      { label: "12.3\" Dijital Gösterge Paneli", value: "✓" },
      { label: "Harman Kardon Ses Sistemi", value: "✓" },
      { label: "Ambient Aydınlatma (16 Renk)", value: "✓" },
      { label: "Kablosuz Şarj", value: "✓" },
    ],
  },
  wheel: {
    title: "JANT & FREN SİSTEMİ",
    rows: [
      { label: "Lastik Ölçüsü", value: "245/45 R19" },
      { label: "Jant", value: "19\" Çift Kollu" },
      { label: "Ön Fren Çapı", value: "348 mm", barPct: 0.82 },
      { label: "Arka Fren Çapı", value: "300 mm", barPct: 0.7 },
      { label: "Fren Tipi", value: "Ventilasyonlu Disk" },
    ],
  },
  dimensions: {
    title: "BOYUTLAR & HACİM",
    rows: [
      { label: "Uzunluk", value: "4.963 mm", barPct: 0.82 },
      { label: "Genişlik", value: "1.868 mm", barPct: 0.68 },
      { label: "Yükseklik", value: "1.467 mm", barPct: 0.55 },
      { label: "Dingil Mesafesi", value: "2.975 mm", barPct: 0.75 },
      { label: "Bagaj Hacmi", value: "520 L", barPct: 0.6 },
    ],
  },
};

const SPEC_DATA_EN: Record<SpecCategory, { title: string; rows: SpecRow[] }> = {
  engine: {
    title: "ENGINE PERFORMANCE",
    rows: [
      { label: "Engine", value: "2.0L TwinPower Turbo" },
      { label: "Power", value: "190 HP", barPct: 0.72 },
      { label: "Torque", value: "400 Nm", barPct: 0.8 },
      { label: "0–100 km/h", value: "7.2 s", barPct: 0.56 },
      { label: "Top speed", value: "235 km/h", barPct: 0.78 },
    ],
  },
  cockpit: {
    title: "INTERIOR FEATURES",
    rows: [
      { label: "Panoramic roof", value: "✓" },
      { label: "Heated & ventilated seats", value: "✓" },
      { label: "12.3\" digital cluster", value: "✓" },
      { label: "Premium sound system", value: "✓" },
      { label: "Ambient lighting (16 colors)", value: "✓" },
      { label: "Wireless charging", value: "✓" },
    ],
  },
  wheel: {
    title: "WHEELS & BRAKES",
    rows: [
      { label: "Tyre size", value: "245/45 R19" },
      { label: "Wheels", value: "19\" twin-spoke" },
      { label: "Front brakes", value: "348 mm", barPct: 0.82 },
      { label: "Rear brakes", value: "300 mm", barPct: 0.7 },
      { label: "Brake type", value: "Ventilated disc" },
    ],
  },
  dimensions: {
    title: "DIMENSIONS & SPACE",
    rows: [
      { label: "Length", value: "4.963 mm", barPct: 0.82 },
      { label: "Width", value: "1.868 mm", barPct: 0.68 },
      { label: "Height", value: "1.467 mm", barPct: 0.55 },
      { label: "Wheelbase", value: "2.975 mm", barPct: 0.75 },
      { label: "Boot volume", value: "520 L", barPct: 0.6 },
    ],
  },
};

type Patch = Record<SpecCategory, { title: string; labels: string[] }>;

const SPEC_PATCH: Partial<Record<LanguageCode, Patch>> = {
  es: {
    engine: {
      title: "RENDIMIENTO DEL MOTOR",
      labels: ["Motor", "Potencia", "Par máximo", "0–100 km/h", "Velocidad máxima"],
    },
    cockpit: {
      title: "EQUIPAMIENTO INTERIOR",
      labels: [
        "Techo panorámico",
        "Asientos calefactados y ventilados",
        "Panel digital 12,3\"",
        "Sistema de audio premium",
        "Iluminación ambiental (16 colores)",
        "Carga inalámbrica",
      ],
    },
    wheel: {
      title: "LLANTAS Y FRENOS",
      labels: ["Neumáticos", "Llantas", "Frenos delanteros", "Frenos traseros", "Tipo de freno"],
    },
    dimensions: {
      title: "DIMENSIONES Y ESPACIO",
      labels: ["Longitud", "Anchura", "Altura", "Batalla", "Maletero"],
    },
  },
  fr: {
    engine: {
      title: "PERFORMANCE MOTEUR",
      labels: ["Moteur", "Puissance", "Couple", "0–100 km/h", "Vitesse max."],
    },
    cockpit: {
      title: "ÉQUIPEMENT INTÉRIEUR",
      labels: [
        "Toit panoramique",
        "Sièges chauffants & ventilés",
        "Compteur numérique 12,3\"",
        "Système audio premium",
        "Éclairage d’ambiance (16 couleurs)",
        "Charge sans fil",
      ],
    },
    wheel: {
      title: "ROUES & FREINS",
      labels: ["Pneus", "Jantes", "Freins avant", "Freins arrière", "Type de frein"],
    },
    dimensions: {
      title: "DIMENSIONS & VOLUMES",
      labels: ["Longueur", "Largeur", "Hauteur", "Empattement", "Coffre"],
    },
  },
  de: {
    engine: {
      title: "MOTORLEISTUNG",
      labels: ["Motor", "Leistung", "Drehmoment", "0–100 km/h", "Höchstgeschw."],
    },
    cockpit: {
      title: "INNENAUSSTATTUNG",
      labels: [
        "Panoramadach",
        "Beheizte & belüftete Sitze",
        "12,3\" Digitaldisplay",
        "Premium-Audiosystem",
        "Ambientelicht (16 Farben)",
        "Induktives Laden",
      ],
    },
    wheel: {
      title: "RÄDER & BREMSEN",
      labels: ["Reifen", "Felgen", "Bremsen vorn", "Bremsen hinten", "Bremsentyp"],
    },
    dimensions: {
      title: "ABMESSUNGEN & RAUM",
      labels: ["Länge", "Breite", "Höhe", "Radstand", "Kofferraum"],
    },
  },
  it: {
    engine: {
      title: "PRESTAZIONI MOTORE",
      labels: ["Motore", "Potenza", "Coppia", "0–100 km/h", "Velocità max"],
    },
    cockpit: {
      title: "DOTAZIONI INTERNI",
      labels: [
        "Tetto panoramico",
        "Sedili riscaldati e ventilati",
        "Display digitale 12,3\"",
        "Sistema audio premium",
        "Luci ambiente (16 colori)",
        "Ricarica wireless",
      ],
    },
    wheel: {
      title: "CERCHI E FRENI",
      labels: ["Pneumatici", "Cerchi", "Freni anteriori", "Freni posteriori", "Tipo freno"],
    },
    dimensions: {
      title: "DIMENSIONI E SPAZI",
      labels: ["Lunghezza", "Larghezza", "Altezza", "Passo", "Bagagliaio"],
    },
  },
  ru: {
    engine: {
      title: "ДВИГАТЕЛЬ И ДИНАМИКА",
      labels: ["Двигатель", "Мощность", "Крутящий момент", "0–100 км/ч", "Макс. скорость"],
    },
    cockpit: {
      title: "ОСНАЩЕНИЕ САЛОНА",
      labels: [
        "Панорамная крыша",
        "Сиденья с подогревом и вентиляцией",
        "Цифровая панель 12,3\"",
        "Премиальная аудиосистема",
        "Амбиентная подсветка (16 цветов)",
        "Беспроводная зарядка",
      ],
    },
    wheel: {
      title: "КОЛЁСА И ТОРМОЗА",
      labels: ["Шины", "Диски", "Передние тормоза", "Задние тормоза", "Тип тормозов"],
    },
    dimensions: {
      title: "ГАБАРИТЫ И ОБЪЁМ",
      labels: ["Длина", "Ширина", "Высота", "Колёсная база", "Багажник"],
    },
  },
  pt: {
    engine: {
      title: "DESEMPENHO DO MOTOR",
      labels: ["Motor", "Potência", "Torque", "0–100 km/h", "Velocidade máx."],
    },
    cockpit: {
      title: "EQUIPAMENTO INTERIOR",
      labels: [
        "Teto panorâmico",
        "Bancos aquecidos e ventilados",
        "Painel digital 12,3\"",
        "Sistema de som premium",
        "Iluminação ambiente (16 cores)",
        "Carregamento sem fio",
      ],
    },
    wheel: {
      title: "RODAS E FREIOS",
      labels: ["Pneus", "Rodas", "Freios dianteiros", "Freios traseiros", "Tipo de freio"],
    },
    dimensions: {
      title: "DIMENSÕES E ESPAÇO",
      labels: ["Comprimento", "Largura", "Altura", "Entre-eixos", "Porta-malas"],
    },
  },
};

function mergeSpec(base: typeof SPEC_DATA_EN, patch: Patch): Record<SpecCategory, { title: string; rows: SpecRow[] }> {
  const cats: SpecCategory[] = ["engine", "cockpit", "wheel", "dimensions"];
  const out = {} as Record<SpecCategory, { title: string; rows: SpecRow[] }>;
  for (const cat of cats) {
    const p = patch[cat];
    out[cat] = {
      title: p.title,
      rows: base[cat].rows.map((r, i) => ({ ...r, label: p.labels[i] ?? r.label })),
    };
  }
  return out;
}

/** Demo spec tablosu — video dili ile başlık ve satır etiketleri */
export function getSpecTableData(lang: LanguageCode): Record<SpecCategory, { title: string; rows: SpecRow[] }> {
  if (lang === "tr") return SPEC_DATA_TR;
  if (lang === "en") return SPEC_DATA_EN;
  const patch = SPEC_PATCH[lang];
  if (patch) return mergeSpec(SPEC_DATA_EN, patch);
  return SPEC_DATA_EN;
}
