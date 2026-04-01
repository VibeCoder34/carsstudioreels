"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Film, Upload, Plus, LayoutDashboard, FolderOpen, Layers,
  Settings, Wand2, TrendingUp, Sparkles, ArrowLeft, X,
  ChevronRight, ImageIcon, Video as VideoIcon, Phone, Brain,
  Star, Sun, CheckCircle2, Zap,
} from "lucide-react";
import {
  PrestigeReels,
  getTotalFrames,
  type MediaItem,
} from "@/remotion/PrestigeReels";
import { imageFileToBase64, extractVideoFrames, extractVideoFramesAtPercents } from "@/lib/frameExtractor";

const Player = dynamic(
  () => import("@remotion/player").then((m) => m.Player),
  { ssr: false }
);

const FPS = 30;

function isVideoFile(file: File): boolean {
  if (file.type?.toLowerCase().startsWith("video/")) return true;
  const name = file.name?.toLowerCase() ?? "";
  return (
    name.endsWith(".mp4") ||
    name.endsWith(".mov") ||
    name.endsWith(".m4v") ||
    name.endsWith(".webm") ||
    name.endsWith(".avi") ||
    name.endsWith(".mkv")
  );
}

function isImageFile(file: File): boolean {
  if (file.type?.toLowerCase().startsWith("image/")) return true;
  const name = file.name?.toLowerCase() ?? "";
  return (
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".webp") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

async function getVideoDurationSeconds(src: string): Promise<number> {
  return await new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;

    video.onloadedmetadata = () => {
      const d = Number.isFinite(video.duration) ? video.duration : 0;
      resolve(d);
    };

    video.onerror = () => reject(new Error("Video okunamadı"));
    video.src = src;
    // Bazı tarayıcılarda metadata yüklemesini tetiklemek için gerekli olabiliyor.
    video.load();
  });
}

function buildOrbitClips(params: {
  src: string;
  durationSeconds: number;
  fps: number;
  clipCount?: number;
  clipSeconds?: number;
  padSeconds?: number;
  windowSeconds?: number;
}): MediaItem[] {
  const {
    src,
    durationSeconds,
    fps,
    clipCount = 10,
    clipSeconds = 1.6,
    padSeconds = 1.0,
    windowSeconds = 10,
  } = params;

  const durationFrames = Math.max(0, Math.floor(durationSeconds * fps));
  const clipFrames = Math.max(1, Math.floor(clipSeconds * fps));

  const windowFrames = Math.max(0, Math.min(durationFrames, Math.floor(windowSeconds * fps)));

  const startMin = Math.floor(padSeconds * fps);
  const startMax = Math.max(
    startMin,
    Math.min(
      durationFrames - clipFrames - Math.floor(padSeconds * fps),
      windowFrames - clipFrames - Math.floor(padSeconds * fps)
    )
  );

  const safeCount = Math.max(1, Math.min(clipCount, 24));
  const clips: MediaItem[] = [];

  for (let i = 0; i < safeCount; i++) {
    const t = safeCount === 1 ? 0.5 : i / (safeCount - 1);
    const inFrame = Math.round(startMin + (startMax - startMin) * t);
    const outFrame = Math.min(durationFrames, inFrame + clipFrames);

    clips.push({
      type: "video",
      src,
      inFrame,
      outFrame,
    });
  }

  return clips;
}

function buildOrbitIntroClip(params: {
  src: string;
  durationSeconds: number;
  fps: number;
  targetSeconds?: number;
}): MediaItem[] {
  const { src, durationSeconds, fps, targetSeconds = 8 } = params;
  const durationFrames = Math.max(0, Math.floor(durationSeconds * fps));
  const outFrame = Math.min(durationFrames, Math.max(1, Math.floor(targetSeconds * fps)));

  return [
    {
      type: "video",
      src,
      inFrame: 0,
      outFrame,
    },
  ];
}

/* ─── Tipler ─────────────────────────────────────────────── */

type Step = "upload" | "analyzing" | "preview";

interface FormData {
  carBrand: string;
  carModel: string;
  year: string;
  price: string;
  ctaPhone: string;
}

interface ShotAnalysis {
  index: number;
  shot_type: string;
  quality_score: number;
  lighting: string;
  is_opener: boolean;
  description: string;
}

interface AnalysisResult {
  analyses: ShotAnalysis[];
  suggestedOrder: number[];
  editingNotes: string;
}

const SHOT_TYPE_LABELS: Record<string, string> = {
  exterior_front: "Dış · Ön",
  exterior_side: "Dış · Yan",
  exterior_rear: "Dış · Arka",
  interior_dashboard: "İç · Panel",
  interior_seats: "İç · Koltuklar",
  detail_wheel: "Detay · Jant",
  detail_logo: "Detay · Logo",
  detail_engine: "Detay · Motor",
  other: "Diğer",
};

/* ─── Ana sayfa ──────────────────────────────────────────── */

export default function DemoPage() {
  const [step, setStep] = useState<Step>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analyzePhase, setAnalyzePhase] = useState("");
  const [analyzeError, setAnalyzeError] = useState("");
  const [layout, setLayout] = useState<"portrait" | "landscape">("portrait");
  const [outroFrames, setOutroFrames] = useState<number>(90);
  const [form, setForm] = useState<FormData>({
    carBrand: "BMW",
    carModel: "5 Serisi 530i xDrive",
    year: "2024",
    price: "₺2.850.000",
    ctaPhone: "0532 123 45 67",
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles = Array.from(fileList).filter((f) => isImageFile(f) || isVideoFile(f));
    setFiles((prev) => [...prev, ...newFiles]);
    setMediaItems((prev) => [
      ...prev,
      ...newFiles.map((f) => ({
        src: URL.createObjectURL(f),
        type: (isVideoFile(f) ? "video" : "image") as "image" | "video",
      })),
    ]);
  }, []);

  const removeItem = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    setAnalyzeError("");
    setStep("analyzing");

    try {
      // Tek uzun "orbit" video için: videodan frame set çıkar → Claude sıralasın → Remotion'da 8 sn montage.
      const isSingleVideo =
        files.length === 1 && files[0] && isVideoFile(files[0]);
      if (isSingleVideo) {
        setAnalyzePhase("Videodan kareler çıkarılıyor...");

        const file = files[0]!;
        const frameCount = 12;
        const percents = Array.from({ length: frameCount }, (_, i) => (i + 1) / (frameCount + 1));

        const base64Frames = await extractVideoFramesAtPercents(file, percents);
        if (base64Frames.length < 4) throw new Error("Videodan yeterli kare çıkarılamadı");

        setAnalyzePhase("AI en sinematik sırayı seçiyor...");

        // Claude API mevcut yapıda "medya bazlı" çalışıyor; bu yüzden her kareyi ayrı medya gibi gönderiyoruz.
        const framesPayload = base64Frames.map((b64, i) => ({
          base64Frames: [b64],
          originalType: "image" as const,
          index: i,
        }));

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ frames: framesPayload }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.details || err.error || "API hatası");
        }

        const result: AnalysisResult = await res.json();

        const order = (result.suggestedOrder ?? [])
          .filter((i) => typeof i === "number" && i >= 0 && i < base64Frames.length);
        const fallbackOrder = Array.from({ length: base64Frames.length }, (_, i) => i);
        const finalOrder = order.length ? order : fallbackOrder;

        // 8 sn hedef: 240 frame @ 30fps. 10 kare seçip hızlı montage yapalım.
        const targetFrames = 8 * FPS;
        const take = Math.min(10, finalOrder.length);
        const perItem = Math.max(8, Math.floor(targetFrames / take));

        const montageItems: MediaItem[] = finalOrder.slice(0, take).map((idx, j) => ({
          type: "image",
          src: `data:image/jpeg;base64,${base64Frames[idx]}`,
          durationFrames: j === 0 ? perItem + 6 : perItem, // opener biraz daha uzun
        }));

        setMediaItems(montageItems);
        setAnalysisResult(result);
        setOutroFrames(0);
        setStep("preview");
        return;
      }

      // Aşama 1: Frame extraction
      setAnalyzePhase("Fotoğraflar hazırlanıyor...");
      const frames = await Promise.all(
        files.map(async (file, i) => {
          const isVideo = isVideoFile(file);
          const base64Frames = isVideo
            ? await extractVideoFrames(file)           // 4 kare: %10, %33, %60, %85
            : [await imageFileToBase64(file)];         // tek kare
          return {
            base64Frames,
            originalType: (isVideo ? "video" : "image") as "image" | "video",
            index: i,
          };
        })
      );

      // Aşama 2: Claude analizi
      setAnalyzePhase("AI görüntüleri analiz ediyor...");
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frames }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || err.error || "API hatası");
      }

      // Aşama 3: Kurgu oluştur
      setAnalyzePhase("Sinematik kurgu oluşturuluyor...");
      const result: AnalysisResult = await res.json();

      // suggestedOrder'a göre medyaları yeniden sırala
      const validOrder = (result.suggestedOrder ?? []).filter(
        (i) => typeof i === "number" && i >= 0 && i < mediaItems.length
      );
      const remaining = Array.from({ length: mediaItems.length }, (_, i) => i).filter(
        (i) => !validOrder.includes(i)
      );
      const finalOrder = [...validOrder, ...remaining];

      setMediaItems(finalOrder.map((i) => mediaItems[i]));
      setFiles(finalOrder.map((i) => files[i]));
      setAnalysisResult(result);
      setOutroFrames(90);
      setStep("preview");
    } catch (err) {
      console.error(err);
      setAnalyzeError(String(err));
      setStep("upload");
    }
  };

  const totalFrames = useMemo(
    () => getTotalFrames(mediaItems, { outroFrames }),
    [mediaItems, outroFrames]
  );

  return (
    <div className="min-h-screen bg-[#06060f] text-white flex">

      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-white/5 flex flex-col">
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <Film className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight">
              CarStudio <span className="text-orange-400">Reels</span>
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {[
            { icon: <LayoutDashboard className="w-4 h-4" />, label: "Dashboard", active: true },
            { icon: <FolderOpen className="w-4 h-4" />, label: "Projeler", active: false },
            { icon: <Layers className="w-4 h-4" />, label: "Şablonlar", active: false },
            { icon: <TrendingUp className="w-4 h-4" />, label: "Analitik", active: false },
            { icon: <Settings className="w-4 h-4" />, label: "Ayarlar", active: false },
          ].map((item) => (
            <a
              key={item.label}
              href="#"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                item.active
                  ? "bg-orange-500/10 text-orange-400 font-medium"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {item.icon} {item.label}
            </a>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/5">
          <div className="bg-gradient-to-br from-orange-500/10 to-red-500/5 border border-orange-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs font-semibold text-orange-400">Pro Plana Geç</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
              Sınırsız video, tüm şablonlar.
            </p>
            <button className="w-full text-[11px] font-semibold bg-gradient-to-r from-orange-500 to-red-600 text-white py-1.5 rounded-lg">
              Yükselt
            </button>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-xs font-bold">
              D
            </div>
            <div>
              <div className="text-xs font-medium">Demo Kullanıcı</div>
              <div className="text-[10px] text-zinc-500">Ücretsiz Plan</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Ana içerik */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          {step === "preview" ? (
            <button
              onClick={() => setStep("upload")}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Geri Dön
            </button>
          ) : step === "analyzing" ? (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Brain className="w-4 h-4 text-orange-400" /> AI Analizi
            </div>
          ) : (
            <h1 className="text-lg font-semibold">Yeni Video Oluştur</h1>
          )}
          <div className="flex items-center gap-4">
            <Link href="/ai-video" className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1">
              <Zap className="w-3 h-3" /> AI Video Üretici
            </Link>
            <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Ana Sayfaya Dön
            </Link>
          </div>
        </header>

        {step === "upload" && (
          <UploadStep
            mediaItems={mediaItems}
            isDragging={isDragging}
            form={form}
            fileInputRef={fileInputRef}
            error={analyzeError}
            layout={layout}
            onLayoutChange={setLayout}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onFileChange={(e) => addFiles(e.target.files)}
            onRemoveItem={removeItem}
            onFormChange={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
            onAnalyze={handleAnalyze}
          />
        )}

        {step === "analyzing" && (
          <AnalyzingStep mediaItems={mediaItems} phase={analyzePhase} />
        )}

        {step === "preview" && (
          <PreviewStep
            mediaItems={mediaItems}
            form={form}
            totalFrames={totalFrames}
            analysisResult={analysisResult}
            layout={layout}
            outroFrames={outroFrames}
            onReset={() => { setStep("upload"); setAnalysisResult(null); }}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Upload adımı ───────────────────────────────────────── */

function UploadStep({
  mediaItems, isDragging, form, fileInputRef, error,
  layout,
  onLayoutChange,
  onDrop, onDragOver, onDragLeave, onFileChange,
  onRemoveItem, onFormChange, onAnalyze,
}: {
  mediaItems: MediaItem[];
  isDragging: boolean;
  form: FormData;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  error: string;
  layout: "portrait" | "landscape";
  onLayoutChange: (layout: "portrait" | "landscape") => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveItem: (i: number) => void;
  onFormChange: (field: keyof FormData, value: string) => void;
  onAnalyze: () => void;
}) {
  const hasMedia = mediaItems.length > 0;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Format seçimi */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Format</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onLayoutChange("portrait"); }}
              className={`px-3 py-2 rounded-xl text-sm border transition-all ${
                layout === "portrait"
                  ? "bg-orange-500/10 border-orange-500/30 text-orange-300"
                  : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
              }`}
            >
              Dikey (9:16)
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onLayoutChange("landscape"); }}
              className={`px-3 py-2 rounded-xl text-sm border transition-all ${
                layout === "landscape"
                  ? "bg-orange-500/10 border-orange-500/30 text-orange-300"
                  : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
              }`}
            >
              Yatay (16:9)
            </button>
          </div>
        </div>

        {/* Şablon rozeti */}
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <div>
            <span className="text-sm font-semibold text-amber-400">Prestige Şablonu</span>
            <span className="text-xs text-zinc-400 ml-2">Sinematik · Lüks · Ken Burns · CTA Outro</span>
          </div>
        </div>

        {/* Hata mesajı */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Upload alanı */}
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-orange-500/60 bg-orange-500/5"
              : "border-white/10 hover:border-orange-500/30 hover:bg-orange-500/[0.02]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={onFileChange}
          />
          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center">
              <Upload className="w-6 h-6 text-orange-400" />
            </div>
          </div>
          <h3 className="font-semibold mb-1">Fotoğraf veya video sürükle</h3>
          <p className="text-zinc-500 text-sm">JPG, PNG, MP4, MOV — karıştırabilirsin</p>
        </div>

        {/* Seçilen medyalar */}
        {hasMedia && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-zinc-300">
                <span className="font-medium">{mediaItems.length}</span> medya seçildi
                <span className="text-zinc-500 ml-2">
                  ({mediaItems.filter(m => m.type === "image").length} fotoğraf,{" "}
                  {mediaItems.filter(m => m.type === "video").length} video)
                </span>
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Ekle
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {mediaItems.map((item, i) => (
                <div key={i} className="relative group aspect-square rounded-xl overflow-hidden bg-zinc-800/80">
                  {item.type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.src} alt="" className="w-full h-full object-cover" />
                  ) : (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video src={item.src} className="w-full h-full object-cover" muted playsInline />
                  )}
                  <div className={`absolute bottom-1 left-1 flex items-center gap-0.5 rounded px-1 py-0.5 ${
                    item.type === "video" ? "bg-blue-600/80" : "bg-zinc-700/70"
                  }`}>
                    {item.type === "video"
                      ? <VideoIcon className="w-2.5 h-2.5 text-white" />
                      : <ImageIcon className="w-2.5 h-2.5 text-white" />
                    }
                  </div>
                  <div className="absolute top-1 left-1 w-4 h-4 bg-black/60 rounded text-[9px] text-white flex items-center justify-center font-medium">
                    {i + 1}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveItem(i); }}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full items-center justify-center opacity-0 group-hover:opacity-100 transition-all flex"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Araç bilgileri */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-300">Araç Bilgileri</h3>
          <div className="grid grid-cols-2 gap-3">
            {(["carBrand", "carModel", "year", "price"] as const).map((field) => (
              <div key={field}>
                <label className="block text-xs text-zinc-500 mb-1.5">
                  {field === "carBrand" ? "Marka" : field === "carModel" ? "Model" : field === "year" ? "Yıl" : "Fiyat"}
                </label>
                <input
                  value={form[field]}
                  onChange={(e) => onFormChange(field, e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/50 transition-colors"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">
              <Phone className="w-3 h-3 inline mr-1" />
              Telefon / WhatsApp (opsiyonel)
            </label>
            <input
              value={form.ctaPhone}
              onChange={(e) => onFormChange("ctaPhone", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/50 transition-colors"
              placeholder="0532 123 45 67"
            />
          </div>
        </div>

        {/* Analiz butonu */}
        <button
          onClick={onAnalyze}
          disabled={!hasMedia}
          className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-base transition-all ${
            !hasMedia
              ? "bg-white/5 text-zinc-600 cursor-not-allowed"
              : "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white shadow-lg shadow-orange-500/20"
          }`}
        >
          <Brain className="w-5 h-5" />
          AI ile Analiz Et & Kurguyu Oluştur
          {hasMedia && <ChevronRight className="w-5 h-5" />}
        </button>

        {hasMedia && (
          <p className="text-center text-xs text-zinc-600">
            Claude Opus, her fotoğrafı analiz edip en sinematik sırayı belirleyecek
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Analiz yükleme ekranı ──────────────────────────────── */

function AnalyzingStep({ mediaItems, phase }: { mediaItems: MediaItem[]; phase: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">

        {/* Animasyonlu ikon */}
        <div className="w-20 h-20 mx-auto mb-6 relative">
          <div className="absolute inset-0 rounded-full bg-orange-500/20 animate-ping" />
          <div className="relative w-full h-full bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Brain className="w-9 h-9 text-white" />
          </div>
        </div>

        <h2 className="text-xl font-bold mb-2">AI Analiz Yapıyor</h2>
        <p className="text-zinc-400 text-sm mb-8 min-h-[20px]">{phase}</p>

        {/* Medya küçük resimleri */}
        <div className="flex gap-2 justify-center flex-wrap">
          {mediaItems.map((item, i) => (
            <div
              key={i}
              className="w-14 h-14 rounded-lg overflow-hidden bg-zinc-800 opacity-50 animate-pulse"
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              {item.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.src} alt="" className="w-full h-full object-cover" />
              ) : (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={item.src} className="w-full h-full object-cover" muted playsInline />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Preview adımı ──────────────────────────────────────── */

function PreviewStep({
  mediaItems, form, totalFrames, analysisResult, layout, outroFrames, onReset,
}: {
  mediaItems: MediaItem[];
  form: FormData;
  totalFrames: number;
  analysisResult: AnalysisResult | null;
  layout: "portrait" | "landscape";
  outroFrames: number;
  onReset: () => void;
}) {
  const durationSec = (totalFrames / FPS).toFixed(1);
  const compWidth = layout === "landscape" ? 1920 : 1080;
  const compHeight = layout === "landscape" ? 1080 : 1920;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-5xl mx-auto">

        {/* Başlık */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold px-4 py-2 rounded-full mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {analysisResult ? "AI Analizi Tamamlandı" : "Önizleme Hazır"}
          </div>
          <h2 className="text-2xl font-bold">
            {form.carBrand} {form.carModel}
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            {mediaItems.length} medya · {durationSec} sn · Prestige Şablonu
          </p>
        </div>

        <div className="flex gap-8 items-start justify-center">

          {/* Telefon mockup */}
          <div className="flex-shrink-0">
            <div className="relative w-[288px]">
              <div className="absolute inset-0 bg-gradient-to-b from-orange-500/15 to-transparent rounded-[48px] blur-2xl scale-110 -z-10" />
              <div className="relative bg-zinc-900 rounded-[46px] p-[10px] shadow-2xl shadow-black/70 border border-white/10">
                <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-[80px] h-[26px] bg-zinc-950 rounded-full z-20 flex items-center justify-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-zinc-800" />
                  <div className="w-[6px] h-[6px] rounded-full bg-zinc-700" />
                </div>
                <div
                  className="rounded-[38px] overflow-hidden bg-black"
                  style={{ aspectRatio: layout === "landscape" ? "16/9" : "9/19.5" }}
                >
                  <Player
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    component={PrestigeReels as any}
                    durationInFrames={totalFrames}
                    fps={FPS}
                    compositionWidth={compWidth}
                    compositionHeight={compHeight}
                    style={{ width: "100%", height: "100%" }}
                    controls
                    autoPlay
                    loop
                    inputProps={{
                      mediaItems,
                      carBrand: form.carBrand,
                      carModel: form.carModel,
                      year: form.year,
                      price: form.price,
                      galleryName: "CarStudio",
                      ctaPhone: form.ctaPhone || undefined,
                      layout,
                      outroFrames,
                    }}
                  />
                </div>
                <div className="flex justify-center pt-2.5 pb-1">
                  <div className="w-24 h-[4px] bg-zinc-700 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Sağ panel */}
          <div className="flex-1 max-w-xs space-y-4 pt-2">

            {/* AI Kurgu Notları */}
            {analysisResult?.editingNotes && (
              <div className="bg-orange-500/[0.06] border border-orange-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-[10px] text-orange-400 uppercase tracking-wider font-semibold">AI Kurgu Notları</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">{analysisResult.editingNotes}</p>
              </div>
            )}

            {/* Medya analiz listesi */}
            {analysisResult?.analyses && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">Analiz Sonuçları</div>
                <div className="space-y-2">
                  {mediaItems.map((item, i) => {
                    const origIndex = analysisResult.suggestedOrder[i] ?? i;
                    const analysis = analysisResult.analyses.find(a => a.index === origIndex);
                    return (
                      <div key={i} className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                          {item.type === "image" ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.src} alt="" className="w-full h-full object-cover" />
                          ) : (
                            // eslint-disable-next-line jsx-a11y/media-has-caption
                            <video src={item.src} className="w-full h-full object-cover" muted playsInline />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-zinc-300">
                              {analysis ? SHOT_TYPE_LABELS[analysis.shot_type] ?? analysis.shot_type : `Medya ${i + 1}`}
                            </span>
                            {analysis?.is_opener && (
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            )}
                          </div>
                          {analysis && (
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 text-amber-400" />
                                <span className="text-[10px] text-zinc-500">{analysis.quality_score}/10</span>
                              </div>
                              <div className="flex items-center gap-0.5">
                                <Sun className="w-2.5 h-2.5 text-zinc-500" />
                                <span className="text-[10px] text-zinc-500">{analysis.lighting}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Araç detayları */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">Araç Detayları</div>
              {[
                ["Marka", form.carBrand],
                ["Model", form.carModel],
                ["Yıl", form.year],
                ["Fiyat", form.price, "text-amber-400 font-semibold"],
              ].map(([label, value, extraClass = ""]) => (
                <div key={label} className="flex justify-between text-sm py-1.5 border-b border-white/[0.04] last:border-0">
                  <span className="text-zinc-500">{label}</span>
                  <span className={`font-medium ${extraClass}`}>{value}</span>
                </div>
              ))}
            </div>

            {/* Platformlar */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">Platformlar</div>
              <div className="flex flex-wrap gap-2">
                {["TikTok", "Instagram Reels", "YouTube Shorts"].map((p) => (
                  <span key={p} className="text-[11px] bg-white/5 border border-white/10 text-zinc-300 px-3 py-1.5 rounded-full">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={onReset}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all"
            >
              <Wand2 className="w-4 h-4" />
              Yeni Video
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
