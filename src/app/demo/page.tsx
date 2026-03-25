"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Film, Upload, Plus, LayoutDashboard, FolderOpen, Layers,
  Settings, Wand2, TrendingUp, Sparkles, ArrowLeft, X,
  ChevronRight, ImageIcon, Video as VideoIcon, Phone,
} from "lucide-react";
import {
  PrestigeReels,
  getTotalFrames,
  type MediaItem,
} from "@/remotion/PrestigeReels";

const Player = dynamic(
  () => import("@remotion/player").then((m) => m.Player),
  { ssr: false }
);

const FPS = 30;

/* ─── Tipler ─────────────────────────────────────────────── */

type Step = "upload" | "preview";

interface FormData {
  carBrand: string;
  carModel: string;
  year: string;
  price: string;
  ctaPhone: string;
}

/* ─── Ana sayfa ──────────────────────────────────────────── */

export default function DemoPage() {
  const [step, setStep] = useState<Step>("upload");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [form, setForm] = useState<FormData>({
    carBrand: "BMW",
    carModel: "5 Serisi 530i xDrive",
    year: "2024",
    price: "₺2.850.000",
    ctaPhone: "0532 123 45 67",
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const items: MediaItem[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"))
      .map((f) => ({
        src: URL.createObjectURL(f),
        type: f.type.startsWith("video/") ? "video" : "image",
      }));
    setMediaItems((prev) => [...prev, ...items]);
  }, []);

  const removeItem = (index: number) =>
    setMediaItems((prev) => prev.filter((_, i) => i !== index));

  const totalFrames = useMemo(() => getTotalFrames(mediaItems), [mediaItems]);

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
          ) : (
            <h1 className="text-lg font-semibold">Yeni Video Oluştur</h1>
          )}
          <a href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            Ana Sayfaya Dön
          </a>
        </header>

        {step === "upload" ? (
          <UploadStep
            mediaItems={mediaItems}
            isDragging={isDragging}
            form={form}
            fileInputRef={fileInputRef}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onFileChange={(e) => addFiles(e.target.files)}
            onRemoveItem={removeItem}
            onFormChange={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
            onGenerate={() => setStep("preview")}
          />
        ) : (
          <PreviewStep
            mediaItems={mediaItems}
            form={form}
            totalFrames={totalFrames}
            onReset={() => setStep("upload")}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Upload adımı ───────────────────────────────────────── */

function UploadStep({
  mediaItems, isDragging, form, fileInputRef,
  onDrop, onDragOver, onDragLeave, onFileChange,
  onRemoveItem, onFormChange, onGenerate,
}: {
  mediaItems: MediaItem[];
  isDragging: boolean;
  form: FormData;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveItem: (i: number) => void;
  onFormChange: (field: keyof FormData, value: string) => void;
  onGenerate: () => void;
}) {
  const hasMedia = mediaItems.length > 0;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Şablon rozeti */}
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <div>
            <span className="text-sm font-semibold text-amber-400">Prestige Şablonu</span>
            <span className="text-xs text-zinc-400 ml-2">Sinematik · Lüks · Ken Burns · CTA Outro</span>
          </div>
        </div>

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
          <p className="text-zinc-500 text-sm">
            JPG, PNG, MP4, MOV — karıştırabilirsin
          </p>
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
                onClick={() => fileInputRef.current?.click()}
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

                  {/* Tip rozeti */}
                  <div className={`absolute bottom-1 left-1 flex items-center gap-0.5 rounded px-1 py-0.5 ${
                    item.type === "video" ? "bg-blue-600/80" : "bg-zinc-700/70"
                  }`}>
                    {item.type === "video"
                      ? <VideoIcon className="w-2.5 h-2.5 text-white" />
                      : <ImageIcon className="w-2.5 h-2.5 text-white" />
                    }
                  </div>

                  {/* Sıra numarası */}
                  <div className="absolute top-1 left-1 w-4 h-4 bg-black/60 rounded text-[9px] text-white flex items-center justify-center font-medium">
                    {i + 1}
                  </div>

                  {/* Sil butonu */}
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
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Marka</label>
              <input
                value={form.carBrand}
                onChange={(e) => onFormChange("carBrand", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/50 transition-colors"
                placeholder="BMW"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Model</label>
              <input
                value={form.carModel}
                onChange={(e) => onFormChange("carModel", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/50 transition-colors"
                placeholder="5 Serisi 530i"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Yıl</label>
              <input
                value={form.year}
                onChange={(e) => onFormChange("year", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/50 transition-colors"
                placeholder="2024"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Fiyat</label>
              <input
                value={form.price}
                onChange={(e) => onFormChange("price", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/50 transition-colors"
                placeholder="₺2.850.000"
              />
            </div>
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

        {/* Oluştur butonu */}
        <button
          onClick={onGenerate}
          disabled={!hasMedia}
          className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-base transition-all ${
            !hasMedia
              ? "bg-white/5 text-zinc-600 cursor-not-allowed"
              : "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white shadow-lg shadow-orange-500/20"
          }`}
        >
          <Wand2 className="w-5 h-5" />
          Prestige Önizlemesi Oluştur
          {hasMedia && <ChevronRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}

/* ─── Preview adımı ──────────────────────────────────────── */

function PreviewStep({
  mediaItems, form, totalFrames, onReset,
}: {
  mediaItems: MediaItem[];
  form: FormData;
  totalFrames: number;
  onReset: () => void;
}) {
  const durationSec = (totalFrames / FPS).toFixed(1);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-5xl mx-auto">

        {/* Başlık */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold px-4 py-2 rounded-full mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Önizleme Hazır
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
              {/* Glow */}
              <div className="absolute inset-0 bg-gradient-to-b from-orange-500/15 to-transparent rounded-[48px] blur-2xl scale-110 -z-10" />

              {/* Çerçeve */}
              <div className="relative bg-zinc-900 rounded-[46px] p-[10px] shadow-2xl shadow-black/70 border border-white/10">
                {/* Kamera */}
                <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-[80px] h-[26px] bg-zinc-950 rounded-full z-20 flex items-center justify-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-zinc-800" />
                  <div className="w-[6px] h-[6px] rounded-full bg-zinc-700" />
                </div>

                {/* Ekran */}
                <div
                  className="rounded-[38px] overflow-hidden bg-black"
                  style={{ aspectRatio: "9/19.5" }}
                >
                  <Player
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    component={PrestigeReels as any}
                    durationInFrames={totalFrames}
                    fps={FPS}
                    compositionWidth={1080}
                    compositionHeight={1920}
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
                    }}
                  />
                </div>

                {/* Alt çubuk */}
                <div className="flex justify-center pt-2.5 pb-1">
                  <div className="w-24 h-[4px] bg-zinc-700 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Sağ panel */}
          <div className="flex-1 max-w-xs space-y-4 pt-2">

            {/* Araç detayları */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">Araç Detayları</div>
              {[
                ["Marka", form.carBrand],
                ["Model", form.carModel],
                ["Yıl", form.year],
                ["Fiyat", form.price, "text-amber-400 font-semibold"],
                ...(form.ctaPhone ? [["Telefon", form.ctaPhone]] : []),
              ].map(([label, value, extraClass = ""]) => (
                <div key={label} className="flex justify-between text-sm py-1.5 border-b border-white/[0.04] last:border-0">
                  <span className="text-zinc-500">{label}</span>
                  <span className={`font-medium ${extraClass}`}>{value}</span>
                </div>
              ))}
            </div>

            {/* Medya listesi */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">Medyalar</div>
              <div className="grid grid-cols-4 gap-1.5">
                {mediaItems.map((item, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-zinc-800">
                    {item.type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.src} alt="" className="w-full h-full object-cover" />
                    ) : (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video src={item.src} className="w-full h-full object-cover" muted playsInline />
                    )}
                    {item.type === "video" && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <VideoIcon className="w-3 h-3 text-white/70" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Platform uyumu */}
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
              <ImageIcon className="w-4 h-4" />
              Yeni Video
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
