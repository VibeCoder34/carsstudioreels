import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getOpenAI, getOpenAIModelIdentify } from "@/lib/openai";
import { parseLanguageCode, type LanguageCode } from "@/lib/languages";

interface IdentifyRequest {
  photos: { base64: string }[];
  videoLanguage?: LanguageCode;
}

export async function POST(req: Request) {
  try {
    const { photos, videoLanguage: rawLang }: IdentifyRequest = await req.json();
    if (!photos?.length) {
      return NextResponse.json({ error: "Fotoğraf bulunamadı" }, { status: 400 });
    }

    const videoLanguage: LanguageCode = parseLanguageCode(rawLang, "tr");

    const openai = getOpenAI();
    const model = getOpenAIModelIdentify();

    const languageLine = `VIDEO LANGUAGE: ${videoLanguage}. All human-readable values you output must be in this language.`;
    const enumsByLang: Record<LanguageCode, { gearbox: string[]; fuel: string[]; drivetrain: string[]; yesNo: string[]; conditionDefault: string }> = {
      tr: {
        gearbox: ["Manuel", "Otomatik", "Yarı Otomatik"],
        fuel: ["Benzin", "Dizel", "LPG", "Benzin & LPG", "Elektrik", "Hibrit"],
        drivetrain: ["Önden Çekiş", "Arkadan İtiş", "4x4", "AWD"],
        yesNo: ["Evet", "Hayır"],
        conditionDefault: "İkinci El",
      },
      en: {
        gearbox: ["Manual", "Automatic", "Semi-automatic"],
        fuel: ["Petrol", "Diesel", "LPG", "Petrol & LPG", "Electric", "Hybrid"],
        drivetrain: ["FWD", "RWD", "4x4", "AWD"],
        yesNo: ["Yes", "No"],
        conditionDefault: "Used",
      },
      es: {
        gearbox: ["Manual", "Automático", "Semiautomático"],
        fuel: ["Gasolina", "Diésel", "GLP", "Gasolina y GLP", "Eléctrico", "Híbrido"],
        drivetrain: ["Tracción delantera", "Tracción trasera", "4x4", "AWD"],
        yesNo: ["Sí", "No"],
        conditionDefault: "Usado",
      },
      fr: {
        gearbox: ["Manuelle", "Automatique", "Semi-automatique"],
        fuel: ["Essence", "Diesel", "GPL", "Essence & GPL", "Électrique", "Hybride"],
        drivetrain: ["Traction", "Propulsion", "4x4", "AWD"],
        yesNo: ["Oui", "Non"],
        conditionDefault: "Occasion",
      },
      de: {
        gearbox: ["Schaltgetriebe", "Automatik", "Halbautomatik"],
        fuel: ["Benzin", "Diesel", "LPG", "Benzin & LPG", "Elektro", "Hybrid"],
        drivetrain: ["Frontantrieb", "Heckantrieb", "4x4", "AWD"],
        yesNo: ["Ja", "Nein"],
        conditionDefault: "Gebraucht",
      },
      it: {
        gearbox: ["Manuale", "Automatico", "Semiautomatico"],
        fuel: ["Benzina", "Diesel", "GPL", "Benzina & GPL", "Elettrico", "Ibrido"],
        drivetrain: ["Trazione anteriore", "Trazione posteriore", "4x4", "AWD"],
        yesNo: ["Sì", "No"],
        conditionDefault: "Usato",
      },
      ru: {
        gearbox: ["Механика", "Автомат", "Робот"],
        fuel: ["Бензин", "Дизель", "LPG", "Бензин и LPG", "Электро", "Гибрид"],
        drivetrain: ["Передний привод", "Задний привод", "4x4", "AWD"],
        yesNo: ["Да", "Нет"],
        conditionDefault: "С пробегом",
      },
      pt: {
        gearbox: ["Manual", "Automático", "Semiautomático"],
        fuel: ["Gasolina", "Diesel", "GLP", "Gasolina & GLP", "Elétrico", "Híbrido"],
        drivetrain: ["Tração dianteira", "Tração traseira", "4x4", "AWD"],
        yesNo: ["Sim", "Não"],
        conditionDefault: "Usado",
      },
    };
    const enums = enumsByLang[videoLanguage] ?? enumsByLang.tr;

    const instruction = `Analyze these car photos and fill the car listing form as accurately as possible.
${languageLine}

Priority:
1) Information clearly visible in the photos
2) Strong visual inference (badges, trim cues, body shape, dashboard layout, etc.)

Rules (strict):
- If the following fields cannot be extracted from photos, return empty string "" and NEVER guess:
  price, km, ilanTarihi, garanti, agirHasarKayitli, plaka, ctaPhone
- "price" and "km" are especially critical: if not clearly visible, return "".
- For these fields, try not to leave them empty if you can infer reliably from visuals:
  carBrand, carModel, year, kasa, yakit, vites, renk, cekis, motor, motorGucu, motorHacmi, seri
- year: if not certain, write the most likely close year based on design cues. If no clue, return "".
- Output ONLY JSON. No markdown, no extra text, no placeholders like "-" or "—".

Allowed enumerations (MUST use one of these exact strings when applicable):
- vites (gearbox): ${enums.gearbox.map((s) => `"${s}"`).join(", ")}
- yakit (fuel): ${enums.fuel.map((s) => `"${s}"`).join(", ")}
- cekis (drivetrain): ${enums.drivetrain.map((s) => `"${s}"`).join(", ")}
- garanti / agirHasarKayitli: ${enums.yesNo.map((s) => `"${s}"`).join(", ")} or "" if unknown
- aracDurumu: if unknown, use "${enums.conditionDefault}"

Return JSON in this exact format:
{
  "carBrand": "",
  "carModel": "",
  "year": "",
  "price": "",
  "ctaPhone": "",
  "km": "",
  "seri": "",
  "motor": "",
  "motorGucu": "",
  "motorHacmi": "",
  "kasa": "",
  "renk": "",
  "vites": "",
  "yakit": "",
  "cekis": "",
  "aracDurumu": "",
  "garanti": "",
  "agirHasarKayitli": "",
  "plaka": "",
  "ilanTarihi": ""
}
`;

    const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
      ...photos.slice(0, 5).map(
        (p): OpenAI.Chat.ChatCompletionContentPart => ({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${p.base64}` },
        }),
      ),
      { type: "text", text: instruction },
    ];

    const completion = await openai.chat.completions.create({
      model,
      max_tokens: 1400,
      temperature: 0,
      seed: 42,
      messages: [{ role: "user", content: userContent }],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) {
        return NextResponse.json({ error: "Araç tanınamadı" }, { status: 422 });
      }
      data = JSON.parse(match[0]);
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[identify]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
