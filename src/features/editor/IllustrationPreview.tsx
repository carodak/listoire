import { CheckboxField, SelectField } from "./Fields.tsx";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Illustration } from "../../contracts/illustration.ts";
import type { StoryProject } from "../../contracts/editor-project.ts";
import type { Cinematic } from "../../contracts/cinematic.ts";
import { LayeredIllustration } from "../presentation/LayeredIllustration.tsx";
import { cinematicDuration } from "../presentation/cinematic-presets.ts";
import { EffectsEngine } from "../presentation/effects.ts";
import { readerTheme } from "../presentation/reader-theme.ts";
import { ShotAtmosphere } from "../presentation/SceneIllustration.tsx";
import { IllustrationEditorial } from "../presentation/IllustrationEditorial.tsx";
import { resolveMediaAsset } from "../../persistence/media-store.ts";

import "./image-composition.css";

const resolvePreview = (asset: Parameters<typeof resolveMediaAsset>[0]) =>
  resolveMediaAsset(asset, "house");
type Language = StoryProject["languages"][string];
interface CompositionPreviewProps {
  image: string;
  value: Illustration;
  assets: NonNullable<Language["configuration"]["assets"]>;
  paper?: string;
  motion: Cinematic;
  layout: string;
  margins: boolean;
}

export function CompositionPreview({
  image,
  value,
  assets,
  paper,
  motion,
  layout,
  margins,
}: CompositionPreviewProps) {
  const { t } = useTranslation();
  const [replay, setReplay] = useState(0);
  const camera = useCompositionCamera(image, value.layers.length, motion, replay);
  const atmosphere = motion.preset === "atmospheric-still" ? "fantasy" : motion.atmosphere;
  return (
    <div className="image-composition-preview" style={readerTheme(paper)} data-margins={margins}>
      <div
        className={`illustration-blend atmosphere-${atmosphere}`}
        data-blend={value.blend !== "none" && layout !== "fullscreen"}
        data-blend-mode={value.blend}
      >
        <LayeredIllustration
          image={image}
          illustration={value}
          assets={assets}
          resolveAsset={resolvePreview}
          moving={motion.preset !== "none"}
          motion={motion}
          cameraRef={camera}
        />
        <IllustrationEditorial
          enabled={value.blend === "soft"}
          mode={value.blend}
          layout={layout}
        />
        <ShotAtmosphere atmosphere={atmosphere} />
      </div>
      <button type="button" onClick={() => setReplay(replay + 1)}>
        {t("editor.image.replay")}
      </button>
      {margins && (
        <span className="image-safe-margin" aria-hidden="true">
          Safe frame · 12% motion margin
        </span>
      )}
    </div>
  );
}

interface PageCompositionFieldsProps {
  value: Illustration;
  onChange: (value: Illustration) => void;
  layout: string;
}

export function PageCompositionFields({ value, onChange, layout }: PageCompositionFieldsProps) {
  return (
    <div className="preset-options">
      <CheckboxField
        label="Smart auto-crop"
        help="Detect transparent or pale-paper margins. Original files remain unchanged; position and scale stay editable."
        checked={value.autoCrop ?? false}
        onChange={(event) => onChange({ ...value, autoCrop: event.target.checked })}
      />
      <SelectField
        label="Frame"
        value={value.aspect}
        options={["landscape", "portrait", "square"] as const}
        onChange={(aspect) => onChange({ ...value, aspect })}
      />
      <SelectField
        label="Page blend"
        value={value.blend}
        options={["paper", "soft", "none"] as const}
        labels={{ paper: "Paper / irregular ink edges", soft: "Soft atmospheric", none: "None" }}
        onChange={(blend) => onChange({ ...value, blend })}
      />
      {layout === "inline" && (
        <SelectField
          label="Text wrapping"
          value={value.wrap}
          options={["none", "left", "right"] as const}
          labels={{
            none: "Full width",
            left: "Illustration left / text on right",
            right: "Illustration right / text on left",
          }}
          onChange={(wrap) => onChange({ ...value, wrap })}
        />
      )}
    </div>
  );
}

function useCompositionCamera(image: string, layers: number, motion: Cinematic, replay: number) {
  const camera = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!camera.current) return;
    const effects = new EffectsEngine(),
      controller = new AbortController();
    effects.play(
      {
        id: "cinematic-camera",
        cinematic: motion,
        duration: cinematicDuration(motion.speed, motion),
      },
      { canvas: camera.current, image: camera.current },
      controller.signal,
      matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    return () => {
      controller.abort();
      effects.stop();
    };
  }, [image, layers, motion, replay]);
  return (node: HTMLDivElement | null) => {
    camera.current = node;
  };
}
