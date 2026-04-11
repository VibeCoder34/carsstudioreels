export type MusicTrackId = "none" | "smooth1" | "smooth2" | "smooth3";

export type MusicTrack = {
  id: MusicTrackId;
  label: string;
  /** `public/` altında path. Örn: "/music/smooth-01.mp3" */
  src?: string;
  /** Lisans notu (kısa). Detay için `public/music/README.md`. */
  licenseNote?: string;
  /** Gerekirse attribution metni. */
  attribution?: string;
};

export const MUSIC_TRACKS: readonly MusicTrack[] = [
  { id: "none", label: "Müzik yok" },
  {
    id: "smooth1",
    label: "Elektronik (Modern)",
    src: "/music/musicelectronic.mp3",
  },
  {
    id: "smooth2",
    label: "Dinamik (Hızlı)",
    src: "/music/musicfast.mp3",
  },
  {
    id: "smooth3",
    label: "Sinematik (Yavaş)",
    src: "/music/musicslow.mp3",
  },
] as const;

export function resolveMusicTrack(id: MusicTrackId): MusicTrack {
  return MUSIC_TRACKS.find((t) => t.id === id) ?? MUSIC_TRACKS[0]!;
}

