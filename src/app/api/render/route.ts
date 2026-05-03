import { NextRequest, NextResponse } from "next/server";
import path from "path";
import os from "os";
import fs from "fs";
import { Storage } from "@google-cloud/storage";

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
  if (style === "dynamic") return 10;
  if (style === "luxury") return 22;
  return 28; // cinematic
}

function resolveOutputScale(bodyScale: unknown): number | undefined {
  const envRaw = process.env.RENDER_SCALE;
  const fromEnv = envRaw !== undefined && envRaw !== "" ? Number(envRaw) : NaN;
  const fromBody = typeof bodyScale === "number" && Number.isFinite(bodyScale) ? bodyScale : NaN;
  const raw = Number.isFinite(fromBody) ? fromBody : fromEnv;
  if (!Number.isFinite(raw)) return undefined;
  const clamped = Math.min(1, Math.max(0.25, raw));
  return clamped >= 0.999 ? undefined : clamped;
}

const X264_PRESET_LIST = [
  "ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow", "placebo",
] as const;

type X264PresetName = (typeof X264_PRESET_LIST)[number];

function isX264Preset(s: string): s is X264PresetName {
  return (X264_PRESET_LIST as readonly string[]).includes(s);
}

/** Bulutta encode kuyruğunu kısaltır; boş env'de production'da veryfast. */
function resolveX264Preset(): X264PresetName | undefined {
  const raw = process.env.RENDER_X264_PRESET?.trim().toLowerCase();
  if (!raw) {
    return process.env.NODE_ENV === "production" ? "veryfast" : undefined;
  }
  return isX264Preset(raw) ? raw : "veryfast";
}

function resolveRenderConcurrency(): number {
  const c = Number(process.env.RENDER_CONCURRENCY);
  if (Number.isFinite(c) && c >= 1 && c <= 8) return Math.floor(c);
  return process.env.NODE_ENV === "production" ? 4 : 2;
}

/** Tek konteynerde en agresif hız: ~4× daha az piksel + encode + paralellik */
function applyTurboRender(opts: {
  outputScale: number | undefined;
  concurrency: number;
  crf: number;
  x264Preset: X264PresetName | undefined;
  jpegQuality: number | undefined;
  offthreadVideoThreads: number | undefined;
}): typeof opts {
  const concurrency = Math.min(8, Math.max(opts.concurrency, 6));
  const jpegQuality = opts.jpegQuality !== undefined ? Math.min(opts.jpegQuality, 72) : 62;
  let offthread = opts.offthreadVideoThreads ?? 4;
  offthread = Math.min(8, Math.max(1, offthread));
  const crfExplicit = process.env.RENDER_CRF !== undefined && process.env.RENDER_CRF !== "";
  const crf = crfExplicit ? opts.crf : Math.max(opts.crf, 26);
  return {
    outputScale: 0.5,
    concurrency,
    crf,
    x264Preset: "ultrafast",
    jpegQuality,
    offthreadVideoThreads: offthread,
  };
}

function chromiumBundleOpts(): {
  browserExecutable?: string;
  chromiumOptions: { gl: "swangle"; disableWebSecurity: boolean };
} {
  const chromiumOptions = { gl: "swangle" as const, disableWebSecurity: true };
  const p = process.env.CHROMIUM_PATH?.trim();
  if (p) return { browserExecutable: p, chromiumOptions };
  return { chromiumOptions };
}

function computeTotalFrames(items: MediaItem[], opts?: { outroFrames?: number; crossfadeFrames?: number }): number {
  const outro = Math.max(0, Math.floor(opts?.outroFrames ?? 90));
  const crossfade = Math.max(0, Math.floor(opts?.crossfadeFrames ?? 20));
  if (!items.length) return outro;
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += getItemDuration(items[i]!);
    if (i > 0) {
      total -= crossfade;
    }
  }
  return Math.max(1, total + outro);
}

export const maxDuration = 1800;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ─── Bundle cache (process başına bir kez) ─────────────────── */

let cachedServeUrl: string | undefined;

async function getServeUrl(): Promise<string> {
  if (cachedServeUrl) return cachedServeUrl;

  try {
    const prebuilt = fs.readFileSync(
      path.join(process.cwd(), ".remotion-bundle-url"),
      "utf-8"
    ).trim();
    if (prebuilt) {
      cachedServeUrl = prebuilt;
      console.log("[render] Pre-built bundle kullanılıyor:", cachedServeUrl);
      return cachedServeUrl;
    }
  } catch {
    // pre-built bundle yoksa runtime'da oluştur (local dev için)
  }

  const { bundle } = await import("@remotion/bundler");

  console.log("[render] Remotion bundle hazırlanıyor…");
  cachedServeUrl = await bundle({
    entryPoint: path.join(process.cwd(), "src/remotion/index.tsx"),
    publicDir: path.join(process.cwd(), "public"),
    webpackOverride: (config) => ({
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...(config.resolve?.alias as Record<string, string> ?? {}),
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
      compositionId?: string;
      /** 0.25–1; 2/3 ≈ 720p sınıfı, CPU render süresini ciddi kısaltır */
      scale?: number;
      /** Sunucuda maksimum hız — düşük çözünürlük (~540p bandı), agresif encode */
      renderTier?: "default" | "turbo";
    };

    const { inputProps, width, height, fps = 30 } = body;

    if (!inputProps || !width || !height) {
      return NextResponse.json(
        { error: "inputProps, width ve height zorunlu" },
        { status: 400 }
      );
    }

    const compositionId =
      body.compositionId === "NeonReels" || body.compositionId === "PrestigeReels"
        ? body.compositionId
        : "PrestigeReels";

    const bucketName = process.env.GCS_BUCKET_NAME ?? "carstudio-video-ai";
    const fileName = `reels/${Date.now()}.mp4`;

    // Duration hesapla
    const ip = inputProps as {
      mediaItems?: MediaItem[];
      outroFrames?: number;
      voiceoverSync?: boolean;
      reelStyle?: ReelStyle;
    };
    const items = Array.isArray(ip.mediaItems) ? ip.mediaItems : [];
    const outroFrames = typeof ip.outroFrames === "number" ? ip.outroFrames : undefined;
    const reelStyle = ip.reelStyle ?? "cinematic";
    const crossfadeFrames = crossfadeFramesForStyle(reelStyle, ip.voiceoverSync === true);
    const durationInFrames = Math.floor(computeTotalFrames(items, { outroFrames, crossfadeFrames }));

    const turbo =
      body.renderTier === "turbo" || process.env.RENDER_FORCE_TURBO === "1";

    let outputScale = resolveOutputScale(body.scale);
    let concurrency = resolveRenderConcurrency();
    let crf = Number(process.env.RENDER_CRF);
    if (!Number.isFinite(crf)) crf = 23;
    let x264Preset = resolveX264Preset();
    const jpegQ = Number(process.env.RENDER_JPEG_QUALITY);
    let jpegQuality =
      Number.isFinite(jpegQ) && jpegQ >= 1 && jpegQ <= 100 ? Math.round(jpegQ) : undefined;
    const ovt = Number(process.env.RENDER_OFFTHREAD_VIDEO_THREADS);
    let offthreadVideoThreads =
      Number.isFinite(ovt) && ovt >= 1 && ovt <= 16 ? Math.floor(ovt) : undefined;

    if (turbo) {
      const t = applyTurboRender({
        outputScale,
        concurrency,
        crf,
        x264Preset,
        jpegQuality,
        offthreadVideoThreads,
      });
      outputScale = t.outputScale;
      concurrency = t.concurrency;
      crf = t.crf;
      x264Preset = t.x264Preset;
      jpegQuality = t.jpegQuality;
      offthreadVideoThreads = t.offthreadVideoThreads;
    }

    /* ─── Remotion Cloud Run (production) ─────────────────────── */
    const cloudRunUrl = process.env.REMOTION_CLOUDRUN_SERVICE_URL;

    if (cloudRunUrl) {
      const serviceUrl = process.env.CLOUD_RUN_SERVICE_URL;
      if (!serviceUrl) {
        return NextResponse.json(
          { error: "CLOUD_RUN_SERVICE_URL env var eksik" },
          { status: 500 }
        );
      }

      // Bundle public/ altına kopyalanmış, HTTP üzerinden erişilebilir
      const serveUrl = `${serviceUrl}/remotion-bundle`;

      const crStart = Date.now();
      console.log(
        `[render] Cloud Run rendering başlıyor… ${width}×${height} @ ${fps}fps — ` +
        `${durationInFrames} frame | service=${cloudRunUrl}` +
        (turbo ? " | TURBO" : "")
      );

      const { renderMediaOnCloudrun } = await import("@remotion/cloudrun/client");

      const result = await renderMediaOnCloudrun({
        cloudRunUrl,
        region: (process.env.GCP_REGION ?? "europe-west1") as Parameters<typeof renderMediaOnCloudrun>[0]["region"],
        serveUrl,
        composition: compositionId,
        inputProps,
        codec: "h264",
        forceBucketName: bucketName,
        outName: fileName,
        forceWidth: width,
        forceHeight: height,
        forceFps: fps,
        crf,
        concurrency,
        ...(Number.isFinite(durationInFrames) && durationInFrames > 0
          ? { forceDurationInFrames: durationInFrames }
          : {}),
        ...(outputScale !== undefined ? { scale: outputScale } : {}),
        ...(x264Preset !== undefined ? { x264Preset } : {}),
        ...(jpegQuality !== undefined ? { jpegQuality } : {}),
        ...(offthreadVideoThreads !== undefined ? { offthreadVideoThreads } : {}),
      });

      const crSec = ((Date.now() - crStart) / 1000).toFixed(1);
      console.log(`[render] Cloud Run tamamlandı: ${crSec}s`, result);

      const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
      return NextResponse.json({ url: publicUrl });
    }

    /* ─── Local / fallback rendering ──────────────────────────── */

    const { renderMedia, selectComposition } = await import("@remotion/renderer");

    const serveUrl = await getServeUrl();
    const chrome = chromiumBundleOpts();

    const composition = await selectComposition({
      serveUrl,
      id: compositionId,
      inputProps,
      ...(chrome.browserExecutable ? { browserExecutable: chrome.browserExecutable } : {}),
      chromiumOptions: chrome.chromiumOptions,
    });

    if (Number.isFinite(durationInFrames) && durationInFrames > 0) {
      composition.durationInFrames = durationInFrames;
    }
    composition.width = width;
    composition.height = height;
    composition.fps = fps;

    const outputPath = path.join(os.tmpdir(), `carstudio-${Date.now()}.mp4`);

    const renderStart = Date.now();
    /** Tam yüzde (0–100); aynı yüzdeyi saniyede yüzlerce kez loglamayı önler */
    let lastLoggedPctInt = -1;
    let lastProgressLogAt = 0;

    console.log(
      `[render] Local rendering başlıyor… ${width}×${height} @ ${fps}fps — ` +
      `${composition.durationInFrames} frame | concurrency=${concurrency} crf=${crf}` +
      (x264Preset ? ` x264=${x264Preset}` : "") +
      (jpegQuality !== undefined ? ` jpegQ=${jpegQuality}` : "") +
      (outputScale !== undefined ? ` | scale=${outputScale}` : "") +
      (turbo ? " | TURBO" : "")
    );

    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: outputPath,
      inputProps,
      crf,
      ...(x264Preset !== undefined ? { x264Preset } : {}),
      ...(jpegQuality !== undefined ? { jpegQuality } : {}),
      concurrency,
      ...(outputScale !== undefined ? { scale: outputScale } : {}),
      ...(offthreadVideoThreads !== undefined ? { offthreadVideoThreads } : {}),
      timeoutInMilliseconds: 30_000,
      ...(chrome.browserExecutable ? { browserExecutable: chrome.browserExecutable } : {}),
      chromiumOptions: chrome.chromiumOptions,
      onProgress: ({ progress, renderedFrames, encodedFrames }) => {
        const pctInt = Math.min(100, Math.floor(progress * 100));
        const now = Date.now();
        const pctChanged = pctInt !== lastLoggedPctInt;
        // Aynı yüzde uzun süre kalırsa (ör. encode sonu) 30 sn'de bir hatırlat
        const heartbeat = now - lastProgressLogAt > 30_000;
        if (!pctChanged && !heartbeat) return;
        lastLoggedPctInt = pctInt;
        lastProgressLogAt = now;
        const elapsed = ((now - renderStart) / 1000).toFixed(1);
        console.log(
          `[render] ${pctInt}% | rendered=${renderedFrames} encoded=${encodedFrames} | ${elapsed}s`
        );
      },
    });

    const totalSec = ((Date.now() - renderStart) / 1000).toFixed(1);
    console.log(`[render] Tamamlandı: ${totalSec}s → ${outputPath}`);

    const storage = new Storage();
    await storage.bucket(bucketName).upload(outputPath, {
      destination: fileName,
      metadata: { contentType: "video/mp4" },
    });
    try { fs.unlinkSync(outputPath); } catch { /* temizlik */ }

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
    console.log("[render] Bucket'a yüklendi:", publicUrl);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("[/api/render] HATA:", err);
    const msg = String(err);
    const msgLower = msg.toLowerCase();

    if (msgLower.includes("chrome") || msgLower.includes("chromium") || msgLower.includes("browser")) {
      return NextResponse.json(
        { error: "Chrome/Chromium tarayıcısı bulunamadı.", details: msg.slice(0, 1000) },
        { status: 500 }
      );
    }
    if (msgLower.includes("ffmpeg")) {
      return NextResponse.json(
        { error: "FFmpeg hatası — encode başarısız.", details: msg.slice(0, 1000) },
        { status: 500 }
      );
    }
    if (msgLower.includes("timeout") || msgLower.includes("timed out")) {
      return NextResponse.json(
        { error: "Render zaman aşımı — frame 30s içinde render edilemedi.", details: msg.slice(0, 1000) },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Render başarısız", details: msg.slice(0, 600) },
      { status: 500 }
    );
  }
}
