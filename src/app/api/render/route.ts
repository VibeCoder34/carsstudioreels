import { NextRequest, NextResponse } from "next/server";
import path from "path";
import os from "os";
import fs from "fs";

type ReelStyle = "cinematic" | "dynamic" | "luxury";
type MediaItem = {
  type: "image" | "video";
  durationFrames?: number;
  inFrame?: number;
  outFrame?: number;
};

function getItemDuration(item: MediaItem): number {
  if (typeof item.durationFrames === "number") {
    return Math.max(1, Math.floor(item.durationFrames));
  }
  if (item.type === "video") {
    if (typeof item.inFrame === "number" && typeof item.outFrame === "number") {
      return Math.max(1, item.outFrame - item.inFrame);
    }
    return 150;
  }
  return 90;
}

function crossfadeFramesForStyle(style: ReelStyle, voiceoverSync: boolean): number {
  if (voiceoverSync) return 0;
  // Keep in sync with `src/remotion/PrestigeReels.tsx` STYLE_PRESETS.
  if (style === "dynamic") return 10;
  if (style === "luxury") return 22;
  return 28; // cinematic
}

function computeTotalFrames(items: MediaItem[], opts?: { outroFrames?: number; crossfadeFrames?: number }): number {
  const outro = Math.max(0, Math.floor(opts?.outroFrames ?? 90));
  const crossfade = Math.max(0, Math.floor(opts?.crossfadeFrames ?? 20));
  if (!items.length) return outro;
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += getItemDuration(items[i]!);
    if (i > 0) {
      // crossfade overlap between previous and current
      total -= crossfade;
    }
  }
  return Math.max(1, total + outro);
}

/* Next.js route segment config — uzun render süresi için timeout 5 dk */
export const maxDuration = 300;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ─── Bundle cache (process başına bir kez) ─────────────────── */

let cachedServeUrl: string | undefined;

async function getServeUrl(): Promise<string> {
  if (cachedServeUrl) return cachedServeUrl;

  const { bundle } = await import("@remotion/bundler");

  console.log("[render] Remotion bundle hazırlanıyor…");
  cachedServeUrl = await bundle({
    entryPoint: path.join(process.cwd(), "src/remotion/index.tsx"),
    // public/ klasörünü serve et — müzik dosyaları için
    publicDir: path.join(process.cwd(), "public"),
    webpackOverride: (config) => ({
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...(config.resolve?.alias as Record<string, string> ?? {}),
          // @/ → src/ alias (tsconfig paths)
          "@": path.join(process.cwd(), "src"),
        },
      },
    }),
  });

  console.log("[render] Bundle hazır:", cachedServeUrl);
  return cachedServeUrl;
}

/* ─── POST /api/render ──────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      inputProps: Record<string, unknown>;
      width: number;
      height: number;
      fps?: number;
    };

    const { inputProps, width, height, fps = 30 } = body;

    if (!inputProps || !width || !height) {
      return NextResponse.json(
        { error: "inputProps, width ve height zorunlu" },
        { status: 400 }
      );
    }

    const { renderMedia, selectComposition } = await import("@remotion/renderer");

    const serveUrl = await getServeUrl();

    /* Composition seç ve boyutları override et */
    const composition = await selectComposition({
      serveUrl,
      id: "PrestigeReels",
      inputProps,
    });

    // Duration: Next/Remotion metadata bazen kısa kalabiliyor.
    // En güvenlisi inputProps'tan toplam frame'i burada hesaplayıp override etmek.
    try {
      const ip = inputProps as {
        mediaItems?: MediaItem[];
        outroFrames?: number;
        voiceoverSync?: boolean;
      };
      const items = Array.isArray(ip.mediaItems) ? ip.mediaItems : [];
      const outroFrames = typeof ip.outroFrames === "number" ? ip.outroFrames : undefined;
      const reelStyle = (inputProps as { reelStyle?: ReelStyle }).reelStyle ?? "cinematic";
      const crossfadeFrames = crossfadeFramesForStyle(reelStyle, ip.voiceoverSync === true);
      const durationInFrames = computeTotalFrames(items, { outroFrames, crossfadeFrames });
      if (Number.isFinite(durationInFrames) && durationInFrames > 0) {
        composition.durationInFrames = Math.floor(durationInFrames);
      }
    } catch (e) {
      console.warn("[render] duration override failed:", e);
    }

    // width/height/fps'i istenen değerlere sabitle
    composition.width = width;
    composition.height = height;
    composition.fps = fps;

    const outputPath = path.join(
      os.tmpdir(),
      `carstudio-${Date.now()}.mp4`
    );

    console.log(`[render] Başlıyor… ${width}×${height} @ ${fps}fps — ${composition.durationInFrames} frame`);

    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: outputPath,
      inputProps,
      // crf: H.264 kalite (18 = yüksek kalite, 23 = varsayılan)
      crf: 18,
      // Cloud Run / Docker container ortamında Chromium yolu ve sandbox ayarı
      ...(process.env.CHROMIUM_PATH ? { browserExecutable: process.env.CHROMIUM_PATH } : {}),
      // Note: Remotion v4 ChromiumOptions does not accept arbitrary `args`.
      // Sandbox flags should be handled by the container/runtime configuration.
      chromiumOptions: {},
      onProgress: ({ progress }) => {
        process.stdout.write(`\r[render] %${(progress * 100).toFixed(1)}`);
      },
    });

    console.log("\n[render] Tamamlandı:", outputPath);

    const videoBuffer = fs.readFileSync(outputPath);
    try { fs.unlinkSync(outputPath); } catch { /* temizlik */ }

    return new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="carstudio-reel.mp4"`,
        "Content-Length": String(videoBuffer.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[/api/render]", err);
    const msg = String(err);

    if (
      msg.toLowerCase().includes("chrome") ||
      msg.toLowerCase().includes("chromium") ||
      msg.toLowerCase().includes("browser")
    ) {
      return NextResponse.json(
        {
          error: "Chrome/Chromium tarayıcısı bulunamadı.",
          details: "Remotion render için Google Chrome kurulu olmalıdır.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Render başarısız", details: msg.slice(0, 600) },
      { status: 500 }
    );
  }
}
