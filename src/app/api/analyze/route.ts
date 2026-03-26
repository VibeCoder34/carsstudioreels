import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

interface FrameInput {
  // Fotoğraflar için tek base64, videolar için birden fazla kare
  base64Frames: string[];
  originalType: "image" | "video";
  index: number;
}

export async function POST(req: NextRequest) {
  try {
    const { frames }: { frames: FrameInput[] } = await req.json();

    if (!frames?.length) {
      return NextResponse.json({ error: "Medya bulunamadı" }, { status: 400 });
    }

    // Her medya için metin etiketi + görüntü bloklarını oluştur
    const contentBlocks: Anthropic.MessageParam["content"] = [];

    for (const frame of frames) {
      const label = frame.originalType === "video"
        ? `── Medya ${frame.index + 1} (Video — ${frame.base64Frames.length} farklı andan kare) ──`
        : `── Medya ${frame.index + 1} (Fotoğraf) ──`;

      contentBlocks.push({ type: "text", text: label });

      for (const b64 of frame.base64Frames) {
        if (!b64) continue;
        contentBlocks.push({
          type: "image",
          source: { type: "base64", media_type: "image/jpeg", data: b64 },
        });
      }
    }

    const promptText = `Bu ${frames.length} araç medyasını analiz et.
Videolar için birden fazla kare gönderildi — videonun farklı bölümlerini temsil ediyor.

Her medya için şunları belirle:
- shot_type: "exterior_front" | "exterior_side" | "exterior_rear" | "interior_dashboard" | "interior_seats" | "detail_wheel" | "detail_logo" | "detail_engine" | "other"
- quality_score: 1-10 görsel kalite puanı
- lighting: "excellent" | "good" | "average" | "poor"
- is_opener: Açılış sahnesi için ideal mi? (sadece 1 tane true olsun)
- description: 1 cümle Türkçe açıklama
- video_highlights: (sadece videolar için) Videonun hangi bölümü en iyi? "beginning" | "middle" | "end"

Ardından suggestedOrder belirle — en sinematik sıralama için.
Kural: en güçlü dış cephe → iç mekan → detaylar.

SADECE şu JSON formatında yanıt ver:
{
  "analyses": [
    {
      "index": 0,
      "shot_type": "exterior_front",
      "quality_score": 8,
      "lighting": "good",
      "is_opener": true,
      "description": "Açıklama",
      "video_highlights": "middle"
    }
  ],
  "suggestedOrder": [0, 1, 2],
  "editingNotes": "Türkçe kurgu notları"
}`;

    contentBlocks.push({ type: "text", text: promptText });

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: contentBlocks }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const rawText = textBlock?.type === "text" ? textBlock.text : "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("Claude geçerli JSON döndürmedi: " + rawText.slice(0, 200));
    }

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error("[/api/analyze]", err);
    return NextResponse.json(
      { error: "Analiz başarısız", details: String(err) },
      { status: 500 }
    );
  }
}
