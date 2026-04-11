"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Upload, Plus, Wand2, Sparkles, ArrowLeft, X,
  ChevronRight, ChevronDown, ImageIcon, Phone, Brain,
  Star, Search, Mic, Loader2, Download,
} from "lucide-react";
import {
  PrestigeReels,
  getTotalFrames,
  STYLE_PRESETS,
  ASPECT_RATIO_DIMENSIONS,
  aspectRatioToLayout,
  type MediaItem,
  type ReelStyle,
  type StylePreset,
  type AspectRatioOption,
} from "@/remotion/PrestigeReels";
import { imageFileToBase64 } from "@/lib/frameExtractor";
import {
  CATEGORY_LABEL_TR,
  SCENE_VARIANTS,
  isFixedCategoryId,
  isSceneVariant,
  type SceneVariant,
} from "@/lib/photoCategories";
import {
  normalizePhotoAnalyzeResult,
  getFlowRecommendation,
  type PhotoAnalyzeResult,
  type StoryboardShot,
  type FlowRecommendation,
} from "@/lib/storyboard";
import {
  attachVoiceoverAudioToMediaItems,
  revokeVoiceoverObjectUrls,
} from "@/lib/voiceoverPipeline";
import { LANGUAGE_OPTIONS, type LanguageCode } from "@/lib/languages";
import { MUSIC_TRACKS, resolveMusicTrack, type MusicTrackId } from "@/lib/music";

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

type Step = "upload" | "identify" | "analyzing" | "preview";

interface FormData {
  carBrand: string;
  carModel: string;
  year: string;
  price: string;
  ctaPhone: string;
  km: string;
  motor: string;
  renk: string;
  vites: string;
  yakit: string;
  kasa: string;
  seri: string;
  aracDurumu: string;
  motorGucu: string;
  motorHacmi: string;
  cekis: string;
  garanti: string;
  agirHasarKayitli: string;
  plaka: string;
  ilanTarihi: string;
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
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>("16:9");
  const [outroFrames, setOutroFrames] = useState<number>(90);
  const [form, setForm] = useState<FormData>({
    carBrand: "",
    carModel: "",
    year: "",
    price: "",
    ctaPhone: "",
    km: "",
    motor: "",
    renk: "",
    vites: "",
    yakit: "",
    kasa: "",
    seri: "",
    aracDurumu: "İkinci El",
    motorGucu: "",
    motorHacmi: "",
    cekis: "",
    garanti: "",
    agirHasarKayitli: "",
    plaka: "",
    ilanTarihi: "",
  });
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identifyAttempted, setIdentifyAttempted] = useState(false);
  const [reelStyle, setReelStyle] = useState<ReelStyle>("cinematic");
  const [videoLanguage, setVideoLanguage] = useState<LanguageCode>("tr");
  const [videoNotes, setVideoNotes] = useState("");
  const [musicTrackId, setMusicTrackId] = useState<MusicTrackId>("smooth1");
  const [voiceoverEnabled, setVoiceoverEnabled] = useState(false);
  const musicVolume = voiceoverEnabled ? 0.6 : 0.8;
  /** TTS kısmen/başarısız olduğunda önizlemede gösterilir */
  const [voiceoverTtsNotice, setVoiceoverTtsNotice] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const preAnalyzeMediaRef = useRef<MediaItem[] | null>(null);

  const identifyCarFromPhotos = useCallback(async (fileList: File[]) => {
    if (!fileList.length) return;
    setIsIdentifying(true);
    try {
      const photos = await Promise.all(
        fileList.slice(0, 5).map(async (file) => {
          const { base64 } = await imageFileToBase64(file);
          return { base64 };
        })
      );
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setForm((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(data as Record<string, string>).filter(
            ([, v]) => typeof v === "string" && v.trim()
          )
        ),
      }));
    } catch (err) {
      console.error("[identify]", err);
    } finally {
      setIsIdentifying(false);
    }
  }, []);

  const addFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles = Array.from(fileList).filter((f) => isImageFile(f));
    if (!newFiles.length) return;
    setFiles((prev) => [...prev, ...newFiles]);
    setMediaItems((prev) => [
      ...prev,
      ...newFiles.map((f) => ({
        src: URL.createObjectURL(f),
        type: "image" as const,
      })),
    ]);
  }, []);

  const goToIdentify = useCallback(() => {
    setForm({
      carBrand: "", carModel: "", year: "", price: "", ctaPhone: "",
      km: "", motor: "", renk: "", vites: "", yakit: "", kasa: "",
      seri: "", aracDurumu: "İkinci El", motorGucu: "", motorHacmi: "",
      cekis: "", garanti: "", agirHasarKayitli: "", plaka: "", ilanTarihi: "",
    });
    setIdentifyAttempted(true);
    setStep("identify");
    setTimeout(() => identifyCarFromPhotos(files), 0);
  }, [files, identifyCarFromPhotos]);

  const removeItem = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    setAnalyzeError("");
    setVoiceoverTtsNotice("");
    setStep("analyzing");
    revokeVoiceoverObjectUrls(mediaItems);
    preAnalyzeMediaRef.current = mediaItems.map((m) => ({ ...m }));

    try {
      setAnalyzePhase("Fotoğraflar hazırlanıyor...");
      const photos = await Promise.all(
        files.map(async (file, i) => {
          const { base64, width, height } = await imageFileToBase64(file);
          return { index: i, base64, width, height };
        })
      );

      setAnalyzePhase("AI fotoğrafları sınıflandırıyor ve kurguyu yazıyor...");
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos,
          aspectRatio,
          videoLanguage,
          userNotes: videoNotes,
          voiceover: voiceoverEnabled,
          ...(voiceoverEnabled ? { voiceoverLanguage: videoLanguage } : {}),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || err.error || "API hatası");
      }

      setAnalyzePhase("Kurgu tamamlanıyor...");
      const raw = await res.json();
      const result = normalizePhotoAnalyzeResult(raw, files.length, {
        voiceover: voiceoverEnabled,
      });

      let ordered: MediaItem[] = result.storyboard.map((shot) => {
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
          voiceoverText: shot.voiceover_text,
        };
      });

      if (voiceoverEnabled) {
        setAnalyzePhase("Seslendirme üretiliyor…");
        const vo = await attachVoiceoverAudioToMediaItems(ordered, result.storyboard, videoLanguage);
        ordered = vo.items;
        if (vo.ttsError) {
          setVoiceoverTtsNotice(vo.ttsError);
        } else if (vo.ttsPartialFailure) {
          setVoiceoverTtsNotice(
            "Bazı sahnelerde ses üretilemedi; bu sahneler sessiz kaldı."
          );
        }
      }

      setMediaItems(ordered);
      setAnalysisResult(result);
      setOutroFrames(result.outro_frames);
      setStep("preview");
    } catch (err) {
      console.error(err);
      setAnalyzeError(String(err));
      setStep("upload");
    }
  };

  const voiceoverSync = useMemo(
    () => voiceoverEnabled && mediaItems.some((m) => Boolean(m.audioSrc)),
    [voiceoverEnabled, mediaItems]
  );

  const totalFrames = useMemo(
    () =>
      getTotalFrames(mediaItems, {
        outroFrames,
        crossfadeFrames: voiceoverSync ? 0 : STYLE_PRESETS[reelStyle].crossfadeFrames,
      }),
    [mediaItems, outroFrames, reelStyle, voiceoverSync]
  );

  const flowRec = useMemo<FlowRecommendation | null>(
    () => files.length > 0 ? getFlowRecommendation(files.length) : null,
    [files.length]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">

      <header className="dashboard-header flex flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
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

      {(step === "preview" || step === "analyzing" || step === "identify") && (
        <div className="dashboard-toolbar flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 sm:px-6">
          {step === "analyzing" ? (
            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <Brain className="w-4 h-4 text-[var(--primary)]" />
              AI analizi
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setStep(step === "preview" ? "upload" : "upload")}
              className="flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Geri dön
            </button>
          )}
          <p className="text-xs text-[var(--muted-foreground)] sm:text-right">
            {step === "preview" ? "Önizleme" : step === "identify" ? "Araç bilgileri" : "İşleniyor…"}
          </p>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {step === "upload" && (
          <UploadStep
            mediaItems={mediaItems}
            isDragging={isDragging}
            fileInputRef={fileInputRef}
            error={analyzeError}
            aspectRatio={aspectRatio}
            reelStyle={reelStyle}
            flowRec={flowRec}
            videoLanguage={videoLanguage}
            videoNotes={videoNotes}
            musicTrackId={musicTrackId}
            musicVolume={musicVolume}
            voiceoverEnabled={voiceoverEnabled}
            onVideoLanguageChange={setVideoLanguage}
            onVideoNotesChange={setVideoNotes}
            onMusicTrackIdChange={setMusicTrackId}
            onVoiceoverEnabledChange={setVoiceoverEnabled}
            onAspectRatioChange={setAspectRatio}
            onStyleChange={setReelStyle}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onFileChange={(e) => addFiles(e.target.files)}
            onRemoveItem={removeItem}
            onNext={goToIdentify}
          />
        )}

        {step === "identify" && (
          <IdentifyStep
            mediaItems={mediaItems}
            form={form}
            isIdentifying={isIdentifying}
            identifyAttempted={identifyAttempted}
            onFormChange={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
            onConfirm={handleAnalyze}
            onBack={() => setStep("upload")}
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
            aspectRatio={aspectRatio}
            outroFrames={outroFrames}
            reelStyle={reelStyle}
            videoLanguage={videoLanguage}
            musicTrackId={musicTrackId}
            musicVolume={musicVolume}
            voiceoverEnabled={voiceoverEnabled}
            voiceoverSync={voiceoverSync}
            ttsNotice={voiceoverTtsNotice}
            onVariantChange={(shotIndex, variant) => {
              setMediaItems((prev) =>
                prev.map((item, i) =>
                  i === shotIndex ? { ...item, sceneVariant: variant } : item
                )
              );
            }}
            onReset={() => {
              revokeVoiceoverObjectUrls(mediaItems);
              if (preAnalyzeMediaRef.current) {
                setMediaItems(preAnalyzeMediaRef.current.map((m) => ({ ...m })));
              }
              setAnalysisResult(null);
              setVoiceoverTtsNotice("");
              setStep("upload");
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Şablon etiketleri (Türkçe) ────────────────────────── */

const VARIANT_LABELS: Record<SceneVariant, string> = {
  full_bleed:       "Tam Ekran",
  slide_entry_left: "Soldan Giriş",
  slide_entry_right:"Sağdan Giriş",
  push_horizontal:  "Yatay İtiş",
  color_wash:       "Renk Yıkaması",
  ken_zoom_slow:    "Yavaş Zoom",
  split_band:       "Bant Bölünmüş",
  split_specs:      "Teknik Bölünmüş",
  floating_card:    "Yüzen Kart",
  callout:          "Etiket Balonu",
  spec_table:       "Teknik Tablo",
  side_table:       "Yan Tablo",
  card_panel:       "Kart Paneli",
  letter_box:       "Letterbox",
  feature_hero:     "Performans Hero",
  duo_split:        "İkili Bölünmüş",
  trio_mosaic:      "Üçlü Mozaik",
  framed_center:    "Çerçeveli Merkez",
  editorial_right:  "Editoryal Sağ",
  editorial_left:   "Editoryal Sol",
  listing_panel:    "İlan Paneli",
  price_reveal:     "Fiyat Vurgusu",
  spotlight:        "Spot Işığı",
  stats_grid:       "İstatistik Grid",
};

const VARIANT_GROUPS: { label: string; variants: SceneVariant[] }[] = [
  {
    label: "Tam Ekran",
    variants: ["full_bleed", "slide_entry_left", "slide_entry_right", "push_horizontal", "color_wash", "ken_zoom_slow", "spotlight"],
  },
  {
    label: "Bölünmüş Düzen",
    variants: ["split_band", "split_specs", "letter_box", "duo_split", "trio_mosaic"],
  },
  {
    label: "Veri & Teknik",
    variants: ["floating_card", "callout", "spec_table", "side_table", "card_panel", "feature_hero", "stats_grid"],
  },
  {
    label: "Editoryal & Satış",
    variants: ["framed_center", "editorial_right", "editorial_left", "listing_panel", "price_reveal"],
  },
];

/* ─── Upload adımı ───────────────────────────────────────── */

const ASPECT_RATIO_OPTIONS: { value: AspectRatioOption; label: string; sub: string; icon: string }[] = [
  { value: "16:9", label: "16:9", sub: "Yatay",   icon: "▬" },
  { value: "9:16", label: "9:16", sub: "Dikey",   icon: "▯" },
  { value: "1:1",  label: "1:1",  sub: "Kare",    icon: "▪" },
  { value: "4:3",  label: "4:3",  sub: "Klasik",  icon: "▭" },
  { value: "3:4",  label: "3:4",  sub: "Dikey+",  icon: "▮" },
];

function UploadStep({
  mediaItems, isDragging, fileInputRef, error,
  aspectRatio, reelStyle, flowRec,
  videoLanguage, videoNotes, musicTrackId, musicVolume, voiceoverEnabled,
  onVideoLanguageChange, onVideoNotesChange, onMusicTrackIdChange, onVoiceoverEnabledChange,
  onAspectRatioChange, onStyleChange,
  onDrop, onDragOver, onDragLeave, onFileChange,
  onRemoveItem, onNext,
}: {
  mediaItems: MediaItem[];
  isDragging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  error: string;
  aspectRatio: AspectRatioOption;
  reelStyle: ReelStyle;
  flowRec: FlowRecommendation | null;
  videoLanguage: LanguageCode;
  videoNotes: string;
  musicTrackId: MusicTrackId;
  musicVolume: number;
  voiceoverEnabled: boolean;
  onVideoLanguageChange: (v: LanguageCode) => void;
  onVideoNotesChange: (v: string) => void;
  onMusicTrackIdChange: (v: MusicTrackId) => void;
  onVoiceoverEnabledChange: (v: boolean) => void;
  onAspectRatioChange: (ar: AspectRatioOption) => void;
  onStyleChange: (style: ReelStyle) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveItem: (i: number) => void;
  onNext: () => void;
}) {
  const hasMedia = mediaItems.length > 0;
  const arDims = ASPECT_RATIO_DIMENSIONS[aspectRatio];

  return (
    <>
      <div className="dashboard-toolbar px-4 py-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--foreground)]">Projelerim</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
              {mediaItems.length} fotoğraf · {aspectRatio} ({arDims.width}×{arDims.height})
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button type="button" className="btn-pill-primary text-sm whitespace-nowrap" disabled title="Yakında">
              + Kredi satın al
            </button>
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
        <div className="max-w-6xl mx-auto grid grid-cols-1 gap-6 sm:gap-8 items-start">
          <div className="space-y-4 sm:space-y-5 min-w-0">

            {/* Fotoğraf yükleme (yalnızca ilk seçimde) */}
            {!hasMedia && (
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
            )}

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

            {/* Akış önerisi / uyarı */}
            {flowRec?.warning && (
              <div className={`rounded-[var(--radius)] border px-4 py-3 text-sm ${
                flowRec.mode === "fast_sequence"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "border-[var(--primary)]/30 bg-[var(--primary)]/8 text-[var(--primary)]"
              }`}>
                <div className="font-semibold mb-0.5">
                  {flowRec.mode === "fast_sequence" ? "Çok fazla fotoğraf" : "Uzun video modu"}
                </div>
                <p className="text-[12px] leading-snug opacity-90">{flowRec.warning}</p>
                {flowRec.suggestion && (
                  <p className="text-[11px] leading-snug mt-1 opacity-75">{flowRec.suggestion}</p>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-[var(--radius)] border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-4 py-3 text-sm text-[var(--destructive)]">
                {error}
              </div>
            )}

            {/* Video stili */}
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

              {/* Çıktı formatı */}
              <div className="pt-2 space-y-2">
                <div className="text-xs text-[var(--muted-foreground)]">Çıktı formatı</div>
                <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
                  {ASPECT_RATIO_OPTIONS.map((opt) => {
                    const active = aspectRatio === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onAspectRatioChange(opt.value)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-[var(--radius)] border text-center transition-all shrink-0 min-w-[64px] ${
                          active
                            ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--foreground)]"
                            : "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/30"
                        }`}
                      >
                        <span className="text-base leading-none">{opt.icon}</span>
                        <span className={`text-xs font-bold ${active ? "text-[var(--primary)]" : ""}`}>{opt.label}</span>
                        <span className="text-[9px] text-[var(--muted-foreground)]">{opt.sub}</span>
                      </button>
                    );
                  })}
                </div>
                {null}
              </div>

              {/* Video dili */}
              <div className="pt-2 space-y-3 border-t border-[var(--border)]">
                <div className="demo-section-label flex items-center gap-2 pt-1">
                  <Brain className="w-4 h-4 text-[var(--primary)]" />
                  Video dili
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  Videodaki yazılar bu dile göre hazırlanır. Seslendirme kapalı olsa da geçerlidir.
                </div>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_OPTIONS.map((opt) => {
                    const active = videoLanguage === opt.code;
                    return (
                      <button
                        key={opt.code}
                        type="button"
                        onClick={() => onVideoLanguageChange(opt.code)}
                        className={`px-4 py-2 rounded-[var(--radius-pill)] text-sm font-medium border transition-all ${
                          active
                            ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                            : "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/30"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <div className="pt-1 space-y-2">
                  <div className="text-xs text-[var(--muted-foreground)]">
                    Eklemek istediğin bir şey var mı? (opsiyonel)
                  </div>
                  <textarea
                    value={videoNotes}
                    onChange={(e) => onVideoNotesChange(e.target.value)}
                    placeholder='Örn: "Daha agresif bir ton", "Fiyatı vurgula", "SUV aile aracı gibi anlat", "Minimal yazı"'
                    className={`${INPUT_CLS} min-h-[90px] resize-y`}
                  />
                </div>
              </div>

              {/* Müzik */}
              <div className="pt-2 space-y-3 border-t border-[var(--border)]">
                <div className="demo-section-label flex items-center gap-2 pt-1">
                  <Sparkles className="w-4 h-4 text-[var(--primary)]" />
                  Müzik
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  Arka plan müziği (telifsiz / lisanslı). Seslendirme açıksa otomatik kısılır.
                </div>
                <select
                  value={musicTrackId}
                  onChange={(e) => onMusicTrackIdChange(e.target.value as MusicTrackId)}
                  className={INPUT_CLS}
                >
                  {MUSIC_TRACKS.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--muted)] px-3 py-2.5">
                  <span className="text-xs text-[var(--muted-foreground)]">Müzik seviyesi</span>
                  <span className="text-xs font-semibold text-[var(--foreground)] tabular-nums">
                    {musicVolume.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Seslendirme */}
              <div className="pt-2 space-y-3 border-t border-[var(--border)]">
                <div className="demo-section-label flex items-center gap-2 pt-1">
                  <Mic className="w-4 h-4 text-[var(--primary)]" />
                  Seslendirme
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={voiceoverEnabled}
                    onChange={(e) => onVoiceoverEnabledChange(e.target.checked)}
                    className="mt-1 rounded border-[var(--border)]"
                  />
                  <span className="text-sm text-[var(--foreground)] leading-snug">
                    Videoya AI seslendirmesi ekle (isteğe bağlı). Açıkken her sahne için söylenecek metin kurguda üretilir ve ses bitene kadar sahne uzatılabilir.
                  </span>
                </label>
                <div className="text-xs text-[var(--muted-foreground)]">
                  Seslendirme dili video diliyle aynıdır.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onNext}
              disabled={!hasMedia}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-[var(--radius-pill)] font-semibold text-base transition-all ${
                !hasMedia
                  ? "bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed"
                  : "bg-gradient-to-r from-[var(--teal)] to-[var(--primary)] text-[var(--primary-foreground)] shadow-lg shadow-[var(--primary)]/20 hover:opacity-95"
              }`}
            >
              İleri — Araç bilgileri
              {hasMedia && <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Ekiple görüşme — sayfanın en altında */}
        <div className="max-w-6xl mx-auto mt-6 lg:mt-8">
          <div className="card-gradient card-gradient--aside min-h-[220px] sm:min-h-[240px]">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius)] bg-white/18 backdrop-blur-sm">
                  <Sparkles className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div className="min-w-0">
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
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-[var(--radius-pill)] bg-white px-5 py-3 text-sm font-semibold text-[var(--primary)] shadow-md transition-opacity hover:opacity-95"
              >
                Randevu al
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Identify adımı ────────────────────────────────────── */

const INPUT_CLS = "w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 focus:border-[var(--ring)]";

function IdentifyStep({
  mediaItems, form, isIdentifying, identifyAttempted, onFormChange, onConfirm, onBack,
}: {
  mediaItems: MediaItem[];
  form: FormData;
  isIdentifying: boolean;
  identifyAttempted: boolean;
  onFormChange: (field: keyof FormData, value: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const requiredMissing = useMemo(() => {
    const missing: string[] = [];
    if (!form.price.trim()) missing.push("Fiyat");
    if (!form.km.trim()) missing.push("KM");
    return missing;
  }, [form.km, form.price]);
  const canConfirm = !isIdentifying && requiredMissing.length === 0;
  const showRequiredUi = identifyAttempted && !isIdentifying;
  const isPriceMissing = showRequiredUi && !form.price.trim();
  const isKmMissing = showRequiredUi && !form.km.trim();

  return (
    <div className="flex-1 overflow-auto px-4 py-6 sm:px-6 bg-[var(--background)]">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Başlık */}
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Araç bilgilerini kontrol et</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            AI fotoğraflardan bilgileri doldurdu — düzenleyip onaylayabilirsin.
          </p>
        </div>

        {/* Küçük fotoğraf grid'i */}
        {mediaItems.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {mediaItems.slice(0, 8).map((item, i) => (
              <div
                key={i}
                className="w-14 h-14 rounded-[var(--radius)] overflow-hidden border border-[var(--border)] bg-[var(--muted)] shrink-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.src} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            {mediaItems.length > 8 && (
              <div className="w-14 h-14 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--muted)] flex items-center justify-center shrink-0">
                <span className="text-xs text-[var(--muted-foreground)] font-medium">+{mediaItems.length - 8}</span>
              </div>
            )}
          </div>
        )}

        {/* AI yükleniyor banner'ı */}
        {isIdentifying && (
          <div className="flex items-center gap-3 rounded-[var(--radius)] border border-[var(--primary)]/30 bg-[var(--primary)]/[0.06] px-4 py-3">
            <Loader2 className="w-4 h-4 text-[var(--primary)] animate-spin shrink-0" />
            <div>
              <p className="text-sm font-medium text-[var(--primary)]">AI fotoğrafları inceliyor…</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Bilgiler otomatik doldurulacak, düzenleyebilirsin.</p>
            </div>
          </div>
        )}

        {/* Form */}
        <div className={`demo-card p-5 space-y-4 transition-opacity ${isIdentifying ? "opacity-50 pointer-events-none" : ""}`}>

          {/* Ana alanlar */}
          <div>
            <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">Temel bilgiler</div>
            <div className="grid grid-cols-2 gap-3">
              {(["carBrand", "carModel", "year", "price"] as const).map((field) => (
                <div key={field}>
                  <label className="flex items-center justify-between gap-2 text-xs text-[var(--muted-foreground)] mb-1.5">
                    <span>
                      {field === "carBrand" ? "Marka" : field === "carModel" ? "Model" : field === "year" ? "Yıl" : "Fiyat"}
                    </span>
                    {showRequiredUi && field === "price" && (
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        Zorunlu
                      </span>
                    )}
                  </label>
                  <input
                    value={form[field]}
                    onChange={(e) => onFormChange(field, e.target.value)}
                    placeholder={field === "carBrand" ? "BMW" : field === "carModel" ? "320i" : field === "year" ? "2020" : "₺500.000"}
                    className={INPUT_CLS}
                  />
                  {field === "price" && isPriceMissing && (
                    <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
                      Lütfen fiyat bilgisini girin.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Teknik alanlar */}
          <div>
            <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">Teknik bilgiler</div>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["seri",      "Seri",        "3 Serisi"],
                  ["km",        "KM",          "0 km"],
                  ["motorGucu", "Motor Gücü",  "150 HP"],
                  ["motorHacmi","Motor Hacmi", "1995 cc"],
                  ["vites",     "Vites",       "Otomatik"],
                  ["yakit",     "Yakıt Tipi",  "Benzin"],
                ] as [keyof FormData, string, string][]
              ).map(([field, label, placeholder]) => (
                <div key={field}>
                  <label className="flex items-center justify-between gap-2 text-xs text-[var(--muted-foreground)] mb-1.5">
                    <span>{label}</span>
                    {showRequiredUi && field === "km" && (
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        Zorunlu
                      </span>
                    )}
                  </label>
                  <input
                    value={form[field]}
                    onChange={(e) => onFormChange(field, e.target.value)}
                    placeholder={placeholder}
                    className={INPUT_CLS}
                  />
                  {field === "km" && isKmMissing && (
                    <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
                      Lütfen kilometre bilgisini girin.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Collapsible: Kasa tipi ve diğer detaylar */}
          <div className="border-t border-[var(--border)] pt-3">
            <button
              type="button"
              onClick={() => setDetailsOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors w-full text-left"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform shrink-0 ${detailsOpen ? "rotate-180" : ""}`} />
              {detailsOpen ? "Daha az göster" : "Kasa tipi ve diğer detaylar"}
            </button>
            {detailsOpen && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {(
                  [
                    ["kasa",             "Kasa Tipi",       "Sedan"],
                    ["renk",             "Renk",            "Siyah"],
                    ["cekis",            "Çekiş",           "Önden Çekiş"],
                    ["motor",            "Motor",           "2.0L Benzin"],
                    ["aracDurumu",       "Araç Durumu",     "İkinci El"],
                    ["garanti",          "Garanti",         "Hayır"],
                    ["agirHasarKayitli", "Ağır Hasar",      "Hayır"],
                    ["plaka",            "Plaka / Uyruk",   "TR Plakalı"],
                    ["ilanTarihi",       "İlan Tarihi",     ""],
                  ] as [keyof FormData, string, string][]
                ).map(([field, label, placeholder]) => (
                  <div key={field}>
                    <label className="block text-xs text-[var(--muted-foreground)] mb-1.5">{label}</label>
                    <input
                      value={form[field]}
                      onChange={(e) => onFormChange(field, e.target.value)}
                      placeholder={placeholder}
                      className={INPUT_CLS}
                    />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="block text-xs text-[var(--muted-foreground)] mb-1.5">
                    <Phone className="w-3 h-3 inline mr-1" />
                    Telefon (opsiyonel)
                  </label>
                  <input
                    value={form.ctaPhone}
                    onChange={(e) => onFormChange("ctaPhone", e.target.value)}
                    placeholder="0532 123 45 67"
                    className={INPUT_CLS}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Butonlar */}
        {showRequiredUi && (
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-xs text-[var(--muted-foreground)]">
            Otomatik doldurulan bilgiler hatalı olabilir. Lütfen kontrol edin.
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center gap-2 py-3 px-5 rounded-[var(--radius-pill)] text-sm font-medium border border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--card)] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Geri
          </button>
          <button
            type="button"
              onClick={() => {
                if (!canConfirm) return;
                onConfirm();
              }}
              disabled={!canConfirm}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[var(--radius-pill)] font-semibold text-base transition-all ${
                !canConfirm
                ? "bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed"
                : "bg-gradient-to-r from-[var(--teal)] to-[var(--primary)] text-[var(--primary-foreground)] shadow-lg shadow-[var(--primary)]/20 hover:opacity-95"
            }`}
          >
            <Brain className="w-5 h-5" />
            Onayla ve kurguyu oluştur
              {canConfirm && <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-center text-xs text-[var(--muted-foreground)]">
          AI: kategori, yorum ve sahne kurgusu (~30–40 sn)
        </p>
      </div>
    </div>
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

/* ─── Blob URL → base64 data URL (render için) ───────────── */

async function blobToDataUrl(url: string): Promise<string> {
  if (!url.startsWith("blob:")) return url;
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Görseli canvas ile yeniden boyutlandır — büyük payload'u azaltır */
async function resizeImage(dataUrl: string, maxPx = 1920): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxPx && height <= maxPx) { resolve(dataUrl); return; }
      const scale = maxPx / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = dataUrl;
  });
}

function PreviewStep({
  mediaItems, form, totalFrames, analysisResult, aspectRatio, outroFrames, reelStyle, videoLanguage, musicTrackId, musicVolume,
  voiceoverEnabled, voiceoverSync, ttsNotice, onReset, onVariantChange,
}: {
  mediaItems: MediaItem[];
  form: FormData;
  totalFrames: number;
  analysisResult: PhotoAnalyzeResult | null;
  aspectRatio: AspectRatioOption;
  outroFrames: number;
  reelStyle: ReelStyle;
  videoLanguage: LanguageCode;
  musicTrackId: MusicTrackId;
  musicVolume: number;
  voiceoverEnabled: boolean;
  voiceoverSync: boolean;
  ttsNotice: string;
  onReset: () => void;
  onVariantChange: (shotIndex: number, variant: SceneVariant) => void;
}) {
  const durationSec = (totalFrames / FPS).toFixed(1);
  const dims = ASPECT_RATIO_DIMENSIONS[aspectRatio];
  const compWidth = dims.width;
  const compHeight = dims.height;
  const layout = aspectRatioToLayout(aspectRatio);
  const isPortrait = layout === "portrait";
  const storyboard = analysisResult?.storyboard ?? [];

  /* ─── Render & download ─────────────────────────────────── */
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState("");
  const [renderError, setRenderError] = useState("");

  const handleDownload = async () => {
    setIsRendering(true);
    setRenderError("");
    setRenderProgress("Görseller hazırlanıyor…");

    try {
      // Blob URL → base64 data URL dönüşümü (sunucu erişemez blob'lara)
      const convertedItems = await Promise.all(
        mediaItems.map(async (item) => {
          const rawData = await blobToDataUrl(item.src);
          const src = item.src.startsWith("blob:") ? await resizeImage(rawData) : rawData;
          const audioSrc = item.audioSrc ? await blobToDataUrl(item.audioSrc) : undefined;
          return { ...item, src, audioSrc };
        })
      );

      // Müzik dosyası: /music/... → tam URL (renderer erişebilsin)
      const bgmRaw = resolveMusicTrack(musicTrackId).src;
      const bgmSrc = bgmRaw?.startsWith("/")
        ? `${window.location.origin}${bgmRaw}`
        : bgmRaw;

      const inputProps = {
        mediaItems: convertedItems,
        carBrand: form.carBrand,
        carModel: form.carModel,
        year: form.year,
        price: form.price,
        galleryName: "CarStudio",
        ctaPhone: form.ctaPhone || undefined,
        km: form.km || undefined,
        motor: form.motor || undefined,
        renk: form.renk || undefined,
        vites: form.vites || undefined,
        yakit: form.yakit || undefined,
        kasa: form.kasa || undefined,
        seri: form.seri || undefined,
        aracDurumu: form.aracDurumu || undefined,
        motorGucu: form.motorGucu || undefined,
        motorHacmi: form.motorHacmi || undefined,
        cekis: form.cekis || undefined,
        garanti: form.garanti || undefined,
        agirHasarKayitli: form.agirHasarKayitli || undefined,
        plaka: form.plaka || undefined,
        ilanTarihi: form.ilanTarihi || undefined,
        layout,
        aspectRatio,
        outroFrames,
        reelStyle,
        voiceoverSync,
        videoLanguage,
        bgmSrc,
        bgmVolume: musicVolume,
      };

      setRenderProgress("Video render ediliyor… (1-4 dk sürebilir)");

      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputProps,
          width: compWidth,
          height: compHeight,
          fps: FPS,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || err.error || "Render API hatası");
      }

      setRenderProgress("İndiriliyor…");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `carstudio-${form.carBrand}-${form.carModel}-${form.year}.mp4`
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9\-_.]/g, "")
        .toLowerCase();
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setRenderProgress("");
    } catch (err) {
      console.error("[download]", err);
      setRenderError(String(err).replace(/^Error:\s*/, ""));
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto px-4 py-6 sm:p-6 bg-[var(--background)]">
      {isRendering && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0b12]/90 p-6 shadow-2xl shadow-black/40">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[var(--primary)]/15 border border-[var(--primary)]/25 flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-[var(--primary)] animate-spin" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">
                  Videonuz indirilmeye hazırlanıyor…
                </div>
                <div className="text-xs text-white/70 mt-0.5">
                  Lütfen bu sekmeyi kapatmayın.
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs text-white/75">
                {renderProgress || "Başlatılıyor…"}
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-[var(--teal)] to-[var(--primary)] animate-pulse" />
              </div>
            </div>

            <div className="mt-4 text-[11px] leading-relaxed text-white/60">
              Bu işlem fotoğraf sayısına ve müzik/seslendirme kullanımına göre 1–4 dk sürebilir.
            </div>
          </div>
        </div>
      )}
      <div className="max-w-5xl mx-auto">

        <div className="mb-6 sm:mb-8 text-center">
          {ttsNotice ? (
            <div
              role="status"
              className="mb-4 max-w-2xl mx-auto rounded-xl border border-amber-500/35 bg-amber-500/[0.08] px-4 py-3 text-left text-xs sm:text-sm text-amber-100/95 leading-relaxed"
            >
              {ttsNotice}
            </div>
          ) : null}
          <div className="inline-flex items-center gap-2 border border-[var(--primary)]/25 bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-semibold px-4 py-2 rounded-[var(--radius-pill)] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
            {analysisResult ? "AI kurgusu hazır" : "Önizleme"}
          </div>
          <h2 className="text-2xl font-bold">
            {form.carBrand} {form.carModel}
          </h2>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">
            {mediaItems.length} sahne · ~{durationSec} sn · {aspectRatio} ({compWidth}×{compHeight})
            {voiceoverEnabled && (
              <span className="block mt-1 text-[11px]">
                Seslendirme:{" "}
                {voiceoverSync
                  ? "açık (ses bitene kadar sahne; sıralı kesim)"
                  : "istendi ancak ses üretilemedi veya metin yok"}
              </span>
            )}
          </p>
        </div>

        <div
          className={
            isPortrait
              ? "flex flex-col gap-8 items-start justify-center lg:grid lg:grid-cols-[420px_360px] lg:gap-10 lg:items-start lg:justify-center"
              : "flex flex-col gap-8 items-start justify-center"
          }
        >

          <div
            className={`flex-shrink-0 w-full flex justify-center mx-auto lg:mx-0 ${
              isPortrait
                ? "max-w-[420px] sm:max-w-[460px] lg:max-w-[420px]"
                : "max-w-4xl"
            }`}
          >
            <div className="relative w-full" style={isPortrait ? { maxHeight: "78vh" } : undefined}>
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/20 to-transparent rounded-2xl blur-3xl -z-10 scale-105" />
              <div
                className="relative rounded-xl overflow-hidden bg-black border border-[var(--border)] shadow-2xl shadow-black/30"
                style={{
                  aspectRatio: `${compWidth}/${compHeight}`,
                  ...(isPortrait ? { maxHeight: "78vh" } : null),
                }}
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
                    km: form.km || undefined,
                    motor: form.motor || undefined,
                    renk: form.renk || undefined,
                    vites: form.vites || undefined,
                    yakit: form.yakit || undefined,
                    kasa: form.kasa || undefined,
                    seri: form.seri || undefined,
                    aracDurumu: form.aracDurumu || undefined,
                    motorGucu: form.motorGucu || undefined,
                    motorHacmi: form.motorHacmi || undefined,
                    cekis: form.cekis || undefined,
                    garanti: form.garanti || undefined,
                    agirHasarKayitli: form.agirHasarKayitli || undefined,
                    plaka: form.plaka || undefined,
                    ilanTarihi: form.ilanTarihi || undefined,
                    layout,
                    aspectRatio,
                    outroFrames,
                    reelStyle,
                    voiceoverSync,
                    videoLanguage,
                    bgmSrc: resolveMusicTrack(musicTrackId).src,
                    bgmVolume: musicVolume,
                  }}
                />
              </div>
            </div>
          </div>

          <div
            className={`w-full ${
              isPortrait
                ? "mx-auto max-w-[420px] sm:max-w-[460px] lg:max-w-[420px]"
                : "w-full max-w-4xl mx-auto"
            }`}
          >
            <div className={isPortrait ? "lg:sticky lg:top-6" : ""}>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-4">
                <div className={isPortrait ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "space-y-4"}>
                  <div className={isPortrait ? "" : "pb-4 border-b border-[var(--border)]"}>
                    <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider mb-3">Araç detayları</div>
                    <div className="space-y-2">
                      {[
                        ["Marka", form.carBrand],
                        ["Model", form.carModel],
                        ["Yıl", form.year],
                        ["Fiyat", form.price, "text-[var(--primary)] font-semibold"],
                      ].map(([label, value, extraClass = ""]) => (
                        <div key={label} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-[var(--muted-foreground)] shrink-0">{label}</span>
                          <span className={`font-medium text-right truncate ${extraClass}`}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider mb-3">Uygun platformlar</div>
                    <div className="flex flex-wrap gap-2">
                      {(aspectRatio === "9:16" || aspectRatio === "3:4"
                        ? ["TikTok", "Instagram Reels", "YouTube Shorts"]
                        : aspectRatio === "1:1"
                        ? ["Instagram Kare", "LinkedIn", "Web / galeri"]
                        : aspectRatio === "4:3"
                        ? ["Facebook", "Web / galeri", "Sunum"]
                        : ["YouTube (16:9)", "Web / galeri", "LinkedIn"]
                      ).map((p) => (
                        <span
                          key={p}
                          className="text-[11px] bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] px-3 py-1.5 rounded-full"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--border)] space-y-2">
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={isRendering}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-[var(--primary-foreground)] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-[var(--primary)]/25"
                  >
                    {isRendering ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {renderProgress || "Hazırlanıyor…"}
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Video İndir (.mp4)
                      </>
                    )}
                  </button>
                  {renderError && (
                    <p className="text-xs text-[var(--destructive)] leading-snug px-1">{renderError}</p>
                  )}
                  {isRendering && (
                    <p className="text-[10px] text-[var(--muted-foreground)] text-center px-2">
                      Render sunucuda yapılıyor — lütfen sayfayı kapatmayın.
                    </p>
                  )}

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
        </div>
      </div>
    </div>
  );
}
