"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Sparkles, Download, ArrowLeft, Film, Zap, X } from "lucide-react";
import { imageFileToBase64 } from "@/lib/frameExtractor";

/* ─── Stil presetleri ────────────────────────────────────── */

const STYLES = [
  {
    id: "studio",
    label: "Stüdyo Reveal",
    emoji: "🎬",
    description: "Karanlık stüdyo, dramatik ışık",
    prompt:
      "Cinematic luxury car reveal in a dark studio, slow 360-degree camera orbit around the vehicle, dramatic rim lighting, high-end automotive photography style, smooth motion, 4K quality",
  },
  {
    id: "street",
    label: "Gece Sokağı",
    emoji: "🌃",
    description: "Islak asfalt, şehir ışıkları",
    prompt:
      "Luxury sports car on a wet city street at night, cinematic camera slowly pushing forward, neon reflections on ground, bokeh city lights in background, dramatic moody atmosphere",
  },
  {
    id: "sunset",
    label: "Altın Saat",
    emoji: "🌅",
    description: "Sahil yolu, gün batımı",
    prompt:
      "Luxury car on a coastal cliff road at golden hour sunset, slow cinematic drone-like camera movement, warm golden light reflecting off the paint, stunning sky backdrop",
  },
  {
    id: "speed",
    label: "Hız & Güç",
    emoji: "⚡",
    description: "Hareket bulanıklığı, dinamizm",
    prompt:
      "High-performance sports car, cinematic motion blur effect, low angle camera tracking alongside, sense of raw speed and power, dramatic lighting, adrenaline atmosphere",
  },
];

type GenStatus = "idle" | "uploading" | "generating" | "done" | "error";

/* ─── Ana sayfa ──────────────────────────────────────────── */

export default function AIVideoPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0].id);
  const [status, setStatus] = useState<GenStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setVideoUrl(null);
    setStatus("idle");
    setErrorMsg("");
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const pollStatus = (taskId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/generate-video?taskId=${taskId}`);
        const data = await res.json();

        setProgress(Math.round((data.progress ?? 0) * 100));

        if (data.status === "SUCCEEDED" && data.videoUrl) {
          stopPolling();
          setVideoUrl(data.videoUrl);
          setStatus("done");
          setProgress(100);
        } else if (data.status === "FAILED") {
          stopPolling();
          setErrorMsg(data.error ?? "Üretim başarısız");
          setStatus("error");
        }
      } catch {
        stopPolling();
        setErrorMsg("Durum sorgulanamadı");
        setStatus("error");
      }
    }, 3000);
  };

  const handleGenerate = async () => {
    if (!imageFile) return;
    stopPolling();
    setStatus("uploading");
    setProgress(0);
    setVideoUrl(null);
    setErrorMsg("");

    try {
      // Fotoğrafı base64'e çevir
      const base64 = await imageFileToBase64(imageFile);
      const style = STYLES.find((s) => s.id === selectedStyle)!;

      setStatus("generating");

      // Runway görevi başlat
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, prompt: style.prompt }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "API hatası");
      }

      const { taskId } = await res.json();
      pollStatus(taskId);
    } catch (err) {
      setErrorMsg(String(err));
      setStatus("error");
    }
  };

  const reset = () => {
    stopPolling();
    setImageFile(null);
    setImagePreview(null);
    setVideoUrl(null);
    setStatus("idle");
    setProgress(0);
    setErrorMsg("");
  };

  const isGenerating = status === "uploading" || status === "generating";

  return (
    <div className="min-h-screen bg-[#06060f] text-white">

      {/* Header */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href="/demo"
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Demo
          </a>
          <span className="text-zinc-700">/</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm">AI Video Üretici</span>
            <span className="text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full font-medium">
              BETA
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Film className="w-3.5 h-3.5" />
          Runway Gen-4 Turbo
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Başlık */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-3">
            Fotoğraftan{" "}
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              Sinematik Video
            </span>
          </h1>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">
            Tek bir araç fotoğrafı yükle. AI saniyeler içinde gerçekçi bir video üretsin.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Sol: Input */}
          <div className="space-y-5">

            {/* Upload alanı */}
            {!imagePreview ? (
              <div
                onDrop={onDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl aspect-[4/3] flex flex-col items-center justify-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-violet-500/60 bg-violet-500/5"
                    : "border-white/10 hover:border-violet-500/30 hover:bg-violet-500/[0.02]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
                <div className="w-14 h-14 bg-violet-500/10 rounded-xl flex items-center justify-center mb-4">
                  <Upload className="w-7 h-7 text-violet-400" />
                </div>
                <p className="font-semibold mb-1">Araç fotoğrafı yükle</p>
                <p className="text-zinc-500 text-sm">JPG, PNG, WEBP</p>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                {!isGenerating && (
                  <button
                    onClick={reset}
                    className="absolute top-3 right-3 w-8 h-8 bg-black/70 rounded-full flex items-center justify-center hover:bg-black transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Stil seçimi */}
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Video Stili</p>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    disabled={isGenerating}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      selectedStyle === style.id
                        ? "border-violet-500/60 bg-violet-500/10"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/20"
                    }`}
                  >
                    <div className="text-lg mb-1">{style.emoji}</div>
                    <div className="text-sm font-medium">{style.label}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{style.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Üret butonu */}
            <button
              onClick={handleGenerate}
              disabled={!imageFile || isGenerating}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-base transition-all ${
                !imageFile || isGenerating
                  ? "bg-white/5 text-zinc-600 cursor-not-allowed"
                  : "bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white shadow-lg shadow-violet-500/25"
              }`}
            >
              <Sparkles className="w-5 h-5" />
              {isGenerating ? "Üretiliyor..." : "Video Üret"}
            </button>
          </div>

          {/* Sağ: Output */}
          <div className="flex flex-col">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Sonuç</p>

            <div className="flex-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden flex flex-col" style={{ minHeight: "400px" }}>

              {/* Boş durum */}
              {status === "idle" && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
                    <Film className="w-8 h-8 text-violet-400/50" />
                  </div>
                  <p className="text-zinc-500 text-sm">
                    Fotoğraf yükle ve stil seç,<br />video burada görünecek
                  </p>
                </div>
              )}

              {/* Üretim durumu */}
              {isGenerating && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 relative mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
                    <div
                      className="absolute inset-0 rounded-full border-2 border-violet-500 border-t-transparent animate-spin"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-violet-400" />
                    </div>
                  </div>
                  <p className="font-semibold mb-1">
                    {status === "uploading" ? "Fotoğraf hazırlanıyor..." : "AI video üretiyor..."}
                  </p>
                  <p className="text-zinc-500 text-sm mb-6">
                    {status === "generating" ? "Genellikle 30-90 saniye sürer" : ""}
                  </p>

                  {status === "generating" && (
                    <div className="w-full max-w-xs">
                      <div className="flex justify-between text-xs text-zinc-500 mb-2">
                        <span>İlerleme</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1.5">
                        <div
                          className="bg-gradient-to-r from-violet-500 to-purple-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(5, progress)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Hata durumu */}
              {status === "error" && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <p className="text-red-400 font-medium mb-2">Bir hata oluştu</p>
                  <p className="text-zinc-500 text-xs mb-4 max-w-xs">{errorMsg}</p>
                  <button
                    onClick={() => setStatus("idle")}
                    className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    Tekrar dene
                  </button>
                </div>
              )}

              {/* Başarılı: video */}
              {status === "done" && videoUrl && (
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 bg-black">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video
                      src={videoUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      controls
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="p-4 border-t border-white/[0.06] flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Video hazır</p>
                      <p className="text-xs text-zinc-500">
                        {STYLES.find(s => s.id === selectedStyle)?.label} · 5 sn · 768×1344
                      </p>
                    </div>
                    <a
                      href={videoUrl}
                      download="ai-video.mp4"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      İndir
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Bilgi kutusu */}
            <div className="mt-4 bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                <span className="text-zinc-400 font-medium">Runway Gen-4 Turbo</span> ile üretiliyor.
                Her üretim ~$0.05 maliyet, 30-90 saniye sürer.
                Üretilen video 7 gün boyunca erişilebilir.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
