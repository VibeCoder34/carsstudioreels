/** Tarayıcıda ses blob/url süresini saniye olarak döndürür. */
export function getAudioDurationSecondsFromUrl(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const a = new Audio();
    a.preload = "metadata";
    a.src = url;
    const done = (sec: number) => {
      a.removeAttribute("src");
      resolve(sec);
    };
    a.onloadedmetadata = () => {
      const d = a.duration;
      if (Number.isFinite(d) && d > 0) done(d);
      else reject(new Error("Invalid audio duration"));
    };
    a.onerror = () => reject(new Error("Failed to load audio for duration"));
  });
}
