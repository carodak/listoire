import { useTranslation } from "react-i18next";
import type { Illustration } from "../../contracts/illustration.ts";
import { illustrationDefaults } from "../../contracts/illustration.ts";
import type { MediaAsset } from "../../contracts/presentation.ts";

const presets = [
  [
    "Landscape",
    "open-plain-rolling-ridges-001",
    "",
    "thin-grass-fringe-framing-the-lower-edge-001",
  ],
  [
    "Character in forest",
    "misty-conifer-plain-001",
    "curly-haired-woman-standing-001",
    "fern-fronds-001",
  ],
  ["Two moons", "barren-plain-two-moons-001", "curly-haired-woman-standing-001", ""],
  [
    "Forest conversation",
    "misty-conifer-plain-001",
    "adult-female-medieval-courier-holding-a-folded-letter-001",
    "forest-ferns-and-roots-frame-001",
  ],
  [
    "Solitary traveller",
    "upland-meadow-footpath-001",
    "adult-female-fantasy-pilgrim-with-staff-001",
    "",
  ],
] as const;
interface IllustrationStartersProps {
  assets: MediaAsset[];
  onApply: (image: string, value: Illustration) => void;
}

export function IllustrationStarters({ assets, onApply }: IllustrationStartersProps) {
  const { t } = useTranslation();
  return (
    <div
      className="illustration-starters"
      role="group"
      aria-label={t("editor.image.groups.starters")}
    >
      {presets.map(([label, background, subject, front]) => {
        const layers: Illustration["layers"] = [];
        if (subject)
          layers.push({ image: `sketch.${subject}`, role: "midground", x: 23, y: 5, scale: 0.9 });
        if (front)
          layers.push({ image: `sketch.${front}`, role: "foreground", x: -10, y: 0, scale: 1.1 });
        const image = `sketch.${background}`,
          available = [image, ...layers.map((layer) => layer.image)].every((id) =>
            assets.some((asset) => asset.id === id),
          );
        return (
          <button
            type="button"
            key={label}
            disabled={!available}
            title={t("editor.image.startersHint")}
            onClick={() => onApply(image, { ...illustrationDefaults(), layers })}
          >
            {t(`editor.image.starters.${label}`)}
          </button>
        );
      })}
    </div>
  );
}
