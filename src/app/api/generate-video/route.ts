import RunwayML from "@runwayml/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new RunwayML({ apiKey: process.env.RUNWAYML_API_SECRET });

/* ─── POST: Yeni video görevi başlat ────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, prompt } = await req.json();

    if (!imageBase64 || !prompt) {
      return NextResponse.json({ error: "Eksik parametre" }, { status: 400 });
    }

    const task = await client.imageToVideo.create({
      model: "gen4_turbo",
      promptImage: `data:image/jpeg;base64,${imageBase64}`,
      promptText: prompt,
      duration: 5,
      ratio: "720:1280", // 9:16 dikey
    });

    return NextResponse.json({ taskId: task.id });
  } catch (err) {
    console.error("[generate-video POST]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/* ─── GET: Görev durumunu sorgula ───────────────────────── */

export async function GET(req: NextRequest) {
  try {
    const taskId = req.nextUrl.searchParams.get("taskId");
    if (!taskId) {
      return NextResponse.json({ error: "taskId gerekli" }, { status: 400 });
    }

    const task = await client.tasks.retrieve(taskId);

    const progress = "progress" in task ? (task.progress as number ?? 0) : 0;

    return NextResponse.json({
      status: task.status,                          // PENDING | RUNNING | SUCCEEDED | FAILED
      progress,
      videoUrl: task.status === "SUCCEEDED" ? task.output?.[0] : null,
      error: task.status === "FAILED" ? "Üretim başarısız" : null,
    });
  } catch (err) {
    console.error("[generate-video GET]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
