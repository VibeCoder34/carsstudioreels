import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface IdentifyRequest {
  photos: { base64: string }[];
}

export async function POST(req: Request) {
  try {
    const { photos }: IdentifyRequest = await req.json();
    if (!photos?.length) {
      return NextResponse.json({ error: "Fotoğraf bulunamadı" }, { status: 400 });
    }

    const imageBlocks = photos.slice(0, 5).map((p) => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: "image/jpeg" as const,
        data: p.base64,
      },
    }));

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1400,
      messages: [
        {
          role: "user",
          content: [
            ...imageBlocks,
            {
              type: "text",
              text: `Bu araç fotoğraflarını incele ve araç ilan formunu mümkün olduğunca doğru doldur.

Öncelik sırası:
1) Fotoğrafta açıkça görünen bilgi
2) Güçlü çıkarım (rozet, trim, kasa tipi, vites/çekiş/yenilikler gibi görsel ipuçları)

Kural:
- Aşağıdaki alanlar fotoğrafta yoksa / çıkarılamıyorsa boş string ("") bırak:
  price, km, ilanTarihi, garanti, agirHasarKayitli, plaka, ctaPhone
- Diğer alanlarda (özellikle carBrand, carModel, year, kasa, yakit, vites, renk, cekis, motor*) mümkünse boş bırakma.
- year alanı: kesin değilse bile, fotoğrafa göre en olası YAKIN yılı yaz (ör. kasa/ön-arka tasarım, far-stop, iç ekran, trim/rozet vb. ipuçlarıyla). Yine de hiçbir ipucu yoksa "" bırak.
- Asla ek metin yazma; sadece JSON.

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

Sadece JSON döndür, başka metin ekleme.`,
            },
          ],
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json({ error: "Araç tanınamadı" }, { status: 422 });
    }

    const data = JSON.parse(match[0]);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[identify]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
