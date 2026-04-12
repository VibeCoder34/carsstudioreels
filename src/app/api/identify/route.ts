import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getOpenAI, getOpenAIModelIdentify } from "@/lib/openai";

interface IdentifyRequest {
  photos: { base64: string }[];
}

export async function POST(req: Request) {
  try {
    const { photos }: IdentifyRequest = await req.json();
    if (!photos?.length) {
      return NextResponse.json({ error: "Fotoğraf bulunamadı" }, { status: 400 });
    }

    const openai = getOpenAI();
    const model = getOpenAIModelIdentify();

    const instruction = `Bu araç fotoğraflarını incele ve araç ilan formunu mümkün olduğunca doğru doldur.

Öncelik sırası:
1) Fotoğrafta açıkça görünen bilgi
2) Güçlü çıkarım (rozet, trim, kasa tipi, vites/çekiş/yenilikler gibi görsel ipuçları)

Kural:
- Aşağıdaki alanlar fotoğrafta yoksa / çıkarılamıyorsa boş string ("") bırak ve ASLA uydurma/varsayma:
  price, km, ilanTarihi, garanti, agirHasarKayitli, plaka, ctaPhone
- "price" ve "km" alanları özellikle kritik: fotoğrafta net değilse "" bırak (tahmin etme).
- Diğer alanlarda (özellikle carBrand, carModel, year, kasa, yakit, vites, renk, cekis, motor*) mümkünse boş bırakma.
- year alanı: kesin değilse bile, fotoğrafa göre en olası YAKIN yılı yaz (ör. kasa/ön-arka tasarım, far-stop, iç ekran, trim/rozet vb. ipuçlarıyla). Yine de hiçbir ipucu yoksa "" bırak.
- Asla ek metin yazma; sadece JSON.
- JSON içinde "-" / "—" gibi placeholder değerler kullanma; bilgi yoksa sadece "" döndür.

Aşağıdaki JSON formatında yanıt ver:
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

Kurallar:
- carBrand: Marka adı (örn: "BMW", "Mercedes-Benz", "Toyota")
- carModel: Model kodu (örn: "320Ci", "C180", "Corolla")
- year: 4 haneli yıl (örn: "2003")
- price: Fotoğrafta yoksa ""
- ctaPhone: Fotoğrafta bir telefon numarası yoksa ""
- km: Fotoğrafta yoksa ""
- seri: Seri adı varsa (örn: "3 Serisi", "C Serisi") — yoksa ""
- motor: Hacim + yakıt tipi (örn: "2.2L Benzin", "2.0 TDI") — yoksa ""
- motorGucu: Güç HP cinsinden (örn: "170 HP") — yoksa ""
- motorHacmi: cc cinsinden (örn: "2171 cc") — yoksa ""
- kasa: Sedan, Hatchback, SUV, Coupe, Cabrio, Station Wagon vb. — yoksa ""
- renk: Türkçe renk adı (örn: "Lacivert", "Gümüş Gri", "Siyah") — yoksa ""
- vites: "Manuel", "Otomatik" veya "Yarı Otomatik" — yoksa ""
- yakit: "Benzin", "Dizel", "LPG", "Benzin & LPG", "Elektrik", "Hibrit" — yoksa ""
- cekis: "Önden Çekiş", "Arkadan İtiş", "4x4", "AWD" — yoksa ""
- aracDurumu: Fotoğraftan anlaşılmıyorsa "İkinci El"
- garanti: "Evet" / "Hayır" — fotoğrafta yoksa ""
- agirHasarKayitli: "Evet" / "Hayır" — fotoğrafta yoksa ""
- plaka: Plaka görünmüyorsa ""
- ilanTarihi: Tarih görünmüyorsa ""

Yanıtın tek bir JSON nesnesi olmalı; başka metin veya markdown kullanma.`;

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
