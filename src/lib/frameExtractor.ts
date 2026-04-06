/* Tarayıcı tarafında medya → base64 JPEG dönüşümleri */

const MAX_PX = 1024;

export interface ImageData {
  base64: string;
  width: number;
  height: number;
}

/** Görüntü dosyasını sıkıştırılmış base64 JPEG'e dönüştürür; orijinal boyutları da döner */
export async function imageFileToBase64(file: File): Promise<ImageData> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const originalWidth = img.width;
      const originalHeight = img.height;
      const ratio = Math.min(MAX_PX / img.width, MAX_PX / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({
        base64: canvas.toDataURL("image/jpeg", 0.82).split(",")[1],
        width: originalWidth,
        height: originalHeight,
      });
      URL.revokeObjectURL(url);
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve({ base64: "", width: 0, height: 0 }); };
    img.src = url;
  });
}

/** Videodan tek bir kareyi base64 JPEG olarak çıkarır */
function extractSingleFrame(video: HTMLVideoElement, atPercent: number): Promise<string> {
  return new Promise((resolve) => {
    const seek = () => {
      video.currentTime = video.duration * atPercent;
    };

    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      const ratio = Math.min(MAX_PX / video.videoWidth, MAX_PX / video.videoHeight, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(video.videoWidth * ratio);
      canvas.height = Math.round(video.videoHeight * ratio);
      canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82).split(",")[1]);
    };

    video.addEventListener("seeked", onSeeked);
    seek();
  });
}

/**
 * Videodan 4 eşit aralıklı kare çeker: %10, %33, %60, %85
 * Böylece başlangıç, orta ve son bölümler Claude tarafından görülür.
 */
export async function extractVideoFrames(file: File): Promise<string[]> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "metadata";

    video.onloadedmetadata = async () => {
      const percents = [0.10, 0.33, 0.60, 0.85];
      const frames: string[] = [];

      for (const pct of percents) {
        const frame = await extractSingleFrame(video, pct);
        if (frame) frames.push(frame);
      }

      URL.revokeObjectURL(url);
      resolve(frames);
    };

    video.onerror = () => { URL.revokeObjectURL(url); resolve([]); };
    video.src = url;
  });
}

/**
 * Videodan verilen percent noktalarında kare çıkarır (0-1 arası).
 * `.mov` gibi formatlarda Remotion timeline seek sorununu by-pass etmek için
 * video montajını bu karelerle (image montage) kurmakta kullanılır.
 */
export async function extractVideoFramesAtPercents(file: File, percents: number[]): Promise<string[]> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "metadata";

    video.onloadedmetadata = async () => {
      const frames: string[] = [];

      for (const pctRaw of percents) {
        const pct = Math.max(0, Math.min(1, pctRaw));
        const frame = await extractSingleFrame(video, pct);
        if (frame) frames.push(frame);
      }

      URL.revokeObjectURL(url);
      resolve(frames);
    };

    video.onerror = () => { URL.revokeObjectURL(url); resolve([]); };
    video.src = url;
  });
}
