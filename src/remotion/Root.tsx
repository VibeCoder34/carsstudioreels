import { Composition } from "remotion";
import {
  PrestigeReels,
  STYLE_PRESETS,
  getTotalFrames,
  type PrestigeReelsProps,
  type MediaItem,
  type ReelStyle,
} from "./PrestigeReels";

const TEST_ITEMS: MediaItem[] = [
  { src: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1080&q=90", type: "image" },
  { src: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1080&q=90", type: "image" },
  { src: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1080&q=90", type: "image" },
];

const defaultProps: PrestigeReelsProps = {
  mediaItems: TEST_ITEMS,
  carBrand: "BMW",
  carModel: "5 Serisi 530i xDrive",
  year: "2024",
  price: "₺2.850.000",
  galleryName: "CarStudio",
  ctaPhone: "0532 123 45 67",
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="PrestigeReels"
      component={PrestigeReels}
      durationInFrames={getTotalFrames(TEST_ITEMS)}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ ...defaultProps, layout: "landscape" }}
      calculateMetadata={({ props }) => {
        const reelStyle = (props.reelStyle ?? "cinematic") as ReelStyle;
        const basePreset = STYLE_PRESETS[reelStyle];
        const crossfadeFrames = (props.voiceoverSync ? 0 : basePreset.crossfadeFrames) ?? basePreset.crossfadeFrames;
        const outroFrames = props.outroFrames;
        const durationInFrames = getTotalFrames(props.mediaItems, { outroFrames, crossfadeFrames });
        return { durationInFrames };
      }}
    />
  );
};
