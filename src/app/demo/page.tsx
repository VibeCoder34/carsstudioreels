"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Upload, Plus, Wand2, Sparkles, ArrowLeft, X,
  ChevronRight, ImageIcon, Phone, Brain,
  Star, Search,
} from "lucide-react";
import {
  PrestigeReels,
  getTotalFrames,
  STYLE_PRESETS,
  type MediaItem,
  type ReelStyle,
  type StylePreset,
} from "@/remotion/PrestigeReels";
import { imageFileToBase64 } from "@/lib/frameExtractor";
import {
  CATEGORY_LABEL_TR,
  isFixedCategoryId,
  isSceneVariant,
} from "@/lib/photoCategories";
import {
  normalizePhotoAnalyzeResult,
  type PhotoAnalyzeResult,
  type StoryboardShot,
} from "@/lib/storyboard";

const Player = dynamic(
  () => import("@remotion/player").then((m) => m.Player),
  { ssr: false }
);

const FPS = 30;

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

/* ─── Tipler ─────────────────────────────────────────────── */

type Step = "upload" | "analyzing" | "preview";

interface FormData {
  carBrand: string;
  carModel: string;
  year: string;
  price: string;
  ctaPhone: string;
}

function categoryTitleTr(shot: StoryboardShot): string {
  if (isFixedCategoryId(shot.category_id)) {
    return CATEGORY_LABEL_TR[shot.category_id];
  }
  return shot.category_label_en || shot.category_id;
}

/* ─── Ana sayfa ──────────────────────────────────────────── */

export default function DemoPage() {
  const [step, setStep] = useState<Step>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [analysisResult, setAnalysisResult] = useState<PhotoAnalyzeResult | null>(null);
  const [analyzePhase, setAnalyzePhase] = useState("");
  const [analyzeError, setAnalyzeError] = useState("");
  const [layout, setLayout] = useState<"portrait" | "landscape">("landscape");
  const [outroFrames, setOutroFrames] = useState<number>(90);
  const [form, setForm] = useState<FormData>({
    carBrand: "BMW",
    carModel: "5 Serisi 530i xDrive",
    year: "2024",
    price: "₺2.850.000",
    ctaPhone: "0532 123 45 67",
  });
  const [reelStyle, setReelStyle] = useState<ReelStyle>("cinematic");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const preAnalyzeMediaRef = useRef<MediaItem[] | null>(null);

  const addFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles = Array.from(fileList).filter((f) => isImageFile(f));
    setFiles((prev) => [...prev, ...newFiles]);
    setMediaItems((prev) => [
      ...prev,
      ...newFiles.map((f) => ({
        src: URL.createObjectURL(f),
        type: "image" as const,
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
    preAnalyzeMediaRef.current = mediaItems.map((m) => ({ ...m }));

    try {
      setAnalyzePhase("Fotoğraflar hazırlanıyor...");
      const photos = await Promise.all(
        files.map(async (file, i) => ({
          index: i,
          base64: await imageFileToBase64(file),
        }))
      );

      setAnalyzePhase("AI fotoğrafları sınıflandırıyor ve kurguyu yazıyor...");
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || err.error || "API hatası");
      }

      setAnalyzePhase("Kurgu tamamlanıyor...");
      const raw = await res.json();
      const result = normalizePhotoAnalyzeResult(raw, files.length);

      const ordered: MediaItem[] = result.storyboard.map((shot) => {
        const idx =
          mediaItems.length > 0
            ? Math.min(mediaItems.length - 1, Math.max(0, shot.source_index))
            : 0;
        const src = mediaItems[idx]?.src ?? mediaItems[0]?.src ?? "";
        return {
          type: "image" as const,
          src,
          durationFrames: shot.duration_frames,
          sceneVariant: isSceneVariant(shot.scene_variant) ? shot.scene_variant : undefined,
          categoryLabelEn: shot.category_label_en || shot.category_id,
        };
      });

      setMediaItems(ordered);
      setAnalysisResult(result);
      setOutroFrames(result.outro_frames);
      setLayout("landscape");
      setStep("preview");
    } catch (err) {
      console.error(err);
      setAnalyzeError(String(err));
      setStep("upload");
    }
  };

  const totalFrames = useMemo(
    () => getTotalFrames(mediaItems, { outroFrames, crossfadeFrames: STYLE_PRESETS[reelStyle].crossfadeFrames }),
    [mediaItems, outroFrames, reelStyle]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">

      <header className="dashboard-header flex flex-wrap items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-8 md:gap-14">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <span className="text-[var(--foreground)] lowercase">car</span>
            <span className="text-[var(--primary)] lowercase">studio</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/#pricing" className="nav-link text-[var(--muted-foreground)] hover:text-[var(--primary)]">
              Fiyatlar
            </Link>
            <span className="nav-link active">Editör</span>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center rounded-[var(--radius-pill)] border border-[var(--border)] bg-[var(--muted)] px-3 py-1 text-xs font-medium text-[var(--muted-foreground)]">
            Beta
          </span>
          <Link href="/" className="btn-pill-primary text-xs py-2 px-4">
            Ana sayfa
          </Link>
        </div>
      </header>

      {(step === "preview" || step === "analyzing") && (
        <div className="dashboard-toolbar flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {step === "preview" ? (
            <button
              type="button"
              onClick={() => setStep("upload")}
              className="flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Geri dön
            </button>
          ) : (
            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <Brain className="w-4 h-4 text-[var(--primary)]" />
              AI analizi
            </div>
          )}
          <p className="text-xs text-[var(--muted-foreground)]">
            {step === "preview" ? "Önizleme" : "İşleniyor…"}
          </p>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {step === "upload" && (
          <UploadStep
            mediaItems={mediaItems}
            isDragging={isDragging}
            form={form}
            fileInputRef={fileInputRef}
            error={analyzeError}
            layout={layout}
            reelStyle={reelStyle}
            onLayoutChange={setLayout}
            onStyleChange={setReelStyle}
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
            reelStyle={reelStyle}
            onReset={() => {
              if (preAnalyzeMediaRef.current) {
                setMediaItems(preAnalyzeMediaRef.current.map((m) => ({ ...m })));
              }
              setAnalysisResult(null);
              setStep("upload");
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Upload adımı ───────────────────────────────────────── */

function UploadStep({
  mediaItems, isDragging, form, fileInputRef, error,
  layout, reelStyle,
  onLayoutChange, onStyleChange,
  onDrop, onDragOver, onDragLeave, onFileChange,
  onRemoveItem, onFormChange, onAnalyze,
}: {
  mediaItems: MediaItem[];
  isDragging: boolean;
  form: FormData;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  error: string;
  layout: "portrait" | "landscape";
  reelStyle: ReelStyle;
  onLayoutChange: (layout: "portrait" | "landscape") => void;
  onStyleChange: (style: ReelStyle) => void;
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
    <>
      <div className="dashboard-toolbar px-4 py-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--foreground)]">Projelerim</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
              {mediaItems.length} fotoğraf · Yatay 16:9 öncelikli
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button type="button" className="btn-pill-primary text-sm whitespace-nowrap" disabled title="Yakında">
              + Kredi satın al
            </button>
            <div className="segmented" role="group" aria-label="Çıktı formatı">
              <button
                type="button"
                className="segmented-item"
                data-active={layout === "landscape" ? "true" : "false"}
                onClick={() => onLayoutChange("landscape")}
              >
                Yatay 16:9
              </button>
              <button
                type="button"
                className="segmented-item"
                data-active={layout === "portrait" ? "true" : "false"}
                onClick={() => onLayoutChange("portrait")}
              >
                Dikey 9:16
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-4 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none z-[1]" />
          <input
            type="search"
            className="input-pill input-pill--readonly"
            placeholder="Plaka veya dosya adı ile ara…"
            readOnly
            aria-readonly
            tabIndex={-1}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-6 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          <div className="lg:col-span-2 space-y-4 sm:space-y-5 min-w-0">

            <div className="demo-card p-4 sm:p-4 flex flex-wrap items-center gap-x-3 gap-y-1 bg-[var(--primary)]/[0.06] border-[var(--primary)]/20">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-[var(--primary)] shrink-0" />
                <span className="text-sm font-semibold text-[var(--primary)]">Prestige şablonu</span>
              </div>
              <span className="text-xs text-[var(--muted-foreground)] w-full sm:w-auto sm:ml-1">
                Sinematik · Ken Burns · CTA outro
              </span>
            </div>

            {error && (
              <div className="rounded-[var(--radius)] border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-4 py-3 text-sm text-[var(--destructive)]">
                {error}
              </div>
            )}

            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`demo-card cursor-pointer border-2 border-dashed p-8 sm:p-10 text-center transition-all ${
                isDragging
                  ? "border-[var(--primary)] bg-[var(--primary)]/5"
                  : "border-[var(--border)] hover:border-[var(--primary)]/45 hover:bg-[var(--primary)]/[0.03]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="hidden"
                onChange={onFileChange}
              />
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                  <Upload className="w-7 h-7 text-[var(--primary)]" />
                </div>
              </div>
              <h3 className="font-semibold text-[var(--foreground)] mb-1">Fotoğraf yükle</h3>
              <p className="text-[var(--muted-foreground)] text-sm">Sürükle-bırak veya tıkla — JPG, PNG, WEBP</p>
            </div>

            {hasMedia && (
              <div className="demo-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-[var(--foreground)]">
                    <span className="font-semibold">{mediaItems.length}</span>
                    <span className="text-[var(--muted-foreground)] ml-1">fotoğraf seçildi</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="btn-pill-primary text-xs py-1.5 px-3"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ekle
                  </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {mediaItems.map((item, i) => (
                    <div key={i} className="relative group aspect-square rounded-[var(--radius)] overflow-hidden bg-[var(--muted)] border border-[var(--border)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.src} alt="" className="w-full h-full object-cover" />
                      <div className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded px-1 py-0.5 bg-[var(--foreground)]/55">
                        <ImageIcon className="w-2.5 h-2.5 text-[var(--primary-foreground)]" />
                      </div>
                      <div className="absolute top-1 left-1 w-4 h-4 bg-black/55 rounded text-[9px] text-white flex items-center justify-center font-medium">
                        {i + 1}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onRemoveItem(i); }}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/65 rounded-full items-center justify-center opacity-0 group-hover:opacity-100 transition-all flex"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="demo-card p-5 space-y-4">
              <h3 className="demo-section-label mb-1">Araç bilgileri</h3>
              <div className="grid grid-cols-2 gap-3">
                {(["carBrand", "carModel", "year", "price"] as const).map((field) => (
                  <div key={field}>
                    <label className="block text-xs text-[var(--muted-foreground)] mb-1.5">
                      {field === "carBrand" ? "Marka" : field === "carModel" ? "Model" : field === "year" ? "Yıl" : "Fiyat"}
                    </label>
                    <input
                      value={form[field]}
                      onChange={(e) => onFormChange(field, e.target.value)}
                      className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 focus:border-[var(--ring)]"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs text-[var(--muted-foreground)] mb-1.5">
                  <Phone className="w-3 h-3 inline mr-1" />
                  Telefon (opsiyonel)
                </label>
                <input
                  value={form.ctaPhone}
                  onChange={(e) => onFormChange("ctaPhone", e.target.value)}
                  className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 focus:border-[var(--ring)]"
                  placeholder="0532 123 45 67"
                />
              </div>
            </div>

            <div className="demo-card p-4 space-y-3">
              <div className="demo-section-label">Video stili</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(Object.values(STYLE_PRESETS) as StylePreset[]).map((preset) => {
                  const active = reelStyle === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onStyleChange(preset.id)}
                      className={`relative flex flex-col items-center gap-1 p-3 rounded-[var(--radius)] border text-center transition-all ${
                        active
                          ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--foreground)]"
                          : "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/30"
                      }`}
                    >
                      <span className="text-xl leading-none">{preset.emoji}</span>
                      <span className={`text-xs font-semibold ${active ? "text-[var(--primary)]" : ""}`}>
                        {preset.label}
                      </span>
                      <span className="text-[10px] text-[var(--muted-foreground)] leading-tight">{preset.description}</span>
                      {active && (
                        <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={onAnalyze}
              disabled={!hasMedia}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-[var(--radius-pill)] font-semibold text-base transition-all ${
                !hasMedia
                  ? "bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed"
                  : "bg-gradient-to-r from-[var(--teal)] to-[var(--primary)] text-[var(--primary-foreground)] shadow-lg shadow-[var(--primary)]/20 hover:opacity-95"
              }`}
            >
              <Brain className="w-5 h-5" />
              AI ile analiz et ve kurguyu oluştur
              {hasMedia && <ChevronRight className="w-5 h-5" />}
            </button>

            {hasMedia && (
              <p className="text-center text-xs text-[var(--muted-foreground)]">
                Claude: kategori, yorum ve sahne kurgusu (~30–40 sn)
              </p>
            )}
          </div>

          <aside className="lg:col-span-1 w-full">
            <div className="card-gradient card-gradient--aside sticky top-4 sm:top-6 min-h-[260px] sm:min-h-[300px]">
              <div className="flex gap-3 w-full">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius)] bg-white/18 backdrop-blur-sm">
                  <Sparkles className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-bold leading-snug text-white">
                    Ekibimizle görüşme planlayın
                  </h3>
                  <p className="mt-2 text-sm text-white/88 leading-relaxed">
                    Galerinize özel demo ve kurumsal paketler için bize ulaşın.
                  </p>
                </div>
              </div>
              <a
                href="mailto:hello@carstudio.example"
                className="inline-flex w-full items-center justify-center rounded-[var(--radius-pill)] bg-white px-5 py-3 text-sm font-semibold text-[var(--primary)] shadow-md transition-opacity hover:opacity-95 mt-1"
              >
                Randevu al
              </a>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

/* ─── Analiz yükleme ekranı ──────────────────────────────── */

function AnalyzingStep({ mediaItems, phase }: { mediaItems: MediaItem[]; phase: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:p-6 bg-[var(--background)]">
      <div className="max-w-sm w-full text-center">

        {/* Animasyonlu ikon */}
        <div className="w-20 h-20 mx-auto mb-6 relative">
          <div className="absolute inset-0 rounded-full bg-[var(--primary)]/20 animate-ping" />
          <div className="relative w-full h-full bg-gradient-to-br from-[#0a455a] to-[var(--primary)] rounded-full flex items-center justify-center shadow-lg shadow-[var(--primary)]/30">
            <Brain className="w-9 h-9 text-[var(--primary-foreground)]" />
          </div>
        </div>

        <h2 className="text-xl font-bold mb-2">AI Analiz Yapıyor</h2>
        <p className="text-[var(--muted-foreground)] text-sm mb-8 min-h-[20px]">{phase}</p>

        {/* Medya küçük resimleri */}
        <div className="flex gap-2 justify-center flex-wrap">
          {mediaItems.map((item, i) => (
            <div
              key={i}
              className="w-14 h-14 rounded-[var(--radius)] overflow-hidden bg-[var(--muted)] border border-[var(--border)] opacity-70 animate-pulse"
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.src} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Preview adımı ──────────────────────────────────────── */

function PreviewStep({
  mediaItems, form, totalFrames, analysisResult, layout, outroFrames, reelStyle, onReset,
}: {
  mediaItems: MediaItem[];
  form: FormData;
  totalFrames: number;
  analysisResult: PhotoAnalyzeResult | null;
  layout: "portrait" | "landscape";
  outroFrames: number;
  reelStyle: ReelStyle;
  onReset: () => void;
}) {
  const durationSec = (totalFrames / FPS).toFixed(1);
  const compWidth = layout === "landscape" ? 1920 : 1080;
  const compHeight = layout === "landscape" ? 1080 : 1920;
  const storyboard = analysisResult?.storyboard ?? [];

  return (
    <div className="flex-1 overflow-auto px-4 py-6 sm:p-6 bg-[var(--background)]">
      <div className="max-w-5xl mx-auto">

        <div className="mb-6 sm:mb-8 text-center">
          <div className="inline-flex items-center gap-2 border border-[var(--primary)]/25 bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-semibold px-4 py-2 rounded-[var(--radius-pill)] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
            {analysisResult ? "AI kurgusu hazır" : "Önizleme"}
          </div>
          <h2 className="text-2xl font-bold">
            {form.carBrand} {form.carModel}
          </h2>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">
            {mediaItems.length} sahne · ~{durationSec} sn · {layout === "landscape" ? "16:9 yatay" : "9:16 dikey"}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start justify-center">

          <div className="flex-shrink-0 w-full flex justify-center max-w-4xl mx-auto lg:mx-0">
            <div className="relative w-full">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/20 to-transparent rounded-2xl blur-3xl -z-10 scale-105" />
              <div
                className="relative rounded-xl overflow-hidden bg-black border border-[var(--border)] shadow-2xl shadow-black/30"
                style={{ aspectRatio: layout === "landscape" ? "16/9" : "9/16" }}
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
                    reelStyle,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex-1 w-full max-w-md mx-auto lg:mx-0 lg:max-w-sm space-y-4">

            {analysisResult?.editing_notes_tr && (
              <div className="demo-card border-[var(--primary)]/20 bg-[var(--primary)]/[0.06] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-3.5 h-3.5 text-[var(--primary)]" />
                  <span className="text-[10px] text-[var(--primary)] uppercase tracking-wider font-semibold">Kurgu notu</span>
                </div>
                <p className="text-xs text-[var(--foreground)] leading-relaxed">{analysisResult.editing_notes_tr}</p>
              </div>
            )}

            {storyboard.length > 0 && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 max-h-[420px] overflow-y-auto">
                <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider mb-3">Sahne sırası &amp; yorum</div>
                <div className="space-y-3">
                  {storyboard.map((shot, i) => (
                    <div key={`${shot.source_index}-${i}`} className="border-b border-[var(--border)] last:border-0 pb-3 last:pb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-[var(--muted-foreground)]">{shot.category_id}</span>
                        <span className="text-[11px] font-semibold text-[var(--foreground)]">
                          {categoryTitleTr(shot)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--muted-foreground)] leading-snug">{shot.comment_tr}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-[var(--muted-foreground)]">
                          <Star className="w-2.5 h-2.5 inline text-amber-400 mr-0.5" />
                          {shot.quality_score}/10
                        </span>
                        <span className="text-[10px] text-[var(--muted-foreground)]">{shot.lighting}</span>
                        <span className="text-[10px] text-[var(--muted-foreground)] font-mono">{shot.scene_variant}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
              <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider mb-3">Araç detayları</div>
              {[
                ["Marka", form.carBrand],
                ["Model", form.carModel],
                ["Yıl", form.year],
                ["Fiyat", form.price, "text-[var(--primary)] font-semibold"],
              ].map(([label, value, extraClass = ""]) => (
                <div key={label} className="flex justify-between text-sm py-1.5 border-b border-[var(--border)] last:border-0">
                  <span className="text-[var(--muted-foreground)]">{label}</span>
                  <span className={`font-medium ${extraClass}`}>{value}</span>
                </div>
              ))}
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
              <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider mb-3">Uygun platformlar</div>
              <div className="flex flex-wrap gap-2">
                {["YouTube (16:9)", "Web / galeri", "LinkedIn"].map((p) => (
                  <span key={p} className="text-[11px] bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] px-3 py-1.5 rounded-full">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={onReset}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium bg-[var(--muted)] hover:bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] transition-all"
            >
              <Wand2 className="w-4 h-4" />
              Düzenlemeye dön
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
