import type { SyntheticEvent } from "react";
import {
  atmospheres,
  cinematicDirections,
  cinematicIntensities,
  cinematicSpeeds,
  illustrationPresets,
} from "../../contracts/cinematic.ts";
import type { Cinematic } from "../../contracts/cinematic.ts";
import type { MediaAsset } from "../../contracts/presentation.ts";
import { useTranslation } from "react-i18next";
import { cinematicDuration, cinematicFrames } from "../presentation/cinematic-presets.ts";
import { useReducedMotion } from "../../shared/use-reduced-motion.ts";
import { Field, SelectField } from "./Fields.tsx";
import { VisualPreview } from "./MediaLibrary.tsx";

/**
 * Presets as cards showing the current image, which plays the preset's movement while its card
 * is hovered or focused; it stays still under reduced motion.
 */
export function PresetCards<T extends string>({
  label,
  help,
  options,
  labels,
  value,
  asset,
  frames,
  duration,
  onChange,
}: {
  label: string;
  help?: string;
  options: readonly T[];
  labels: (option: T) => string;
  value: T;
  asset?: MediaAsset;
  frames: (option: T) => Keyframe[];
  duration: (option: T) => number;
  onChange: (option: T) => void;
}) {
  const reduced = useReducedMotion();
  const play = (event: SyntheticEvent<HTMLElement>, option: T) => {
    const image = event.currentTarget.querySelector("img");
    if (reduced || !image || image.getAnimations().length) return;
    image.animate(frames(option), {
      duration: duration(option),
      iterations: Infinity,
      easing: "ease-in-out",
    });
  };
  const stop = (event: SyntheticEvent<HTMLElement>) =>
    event.currentTarget
      .querySelector("img")
      ?.getAnimations()
      .forEach((animation) => animation.cancel());
  return (
    <fieldset className="preset-cards" title={help}>
      <legend>{label}</legend>
      <div className="preset-cards-grid">
        {options.map((option) => (
          <button
            type="button"
            key={option}
            aria-pressed={value === option}
            data-preset={option}
            onClick={() => onChange(option)}
            onPointerEnter={(event) => play(event, option)}
            onPointerLeave={stop}
            onFocus={(event) => play(event, option)}
            onBlur={stop}
          >
            <span className="preset-thumb" aria-hidden="true">
              {asset && <VisualPreview asset={asset} />}
            </span>
            {labels(option)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** The camera presets (two pictures or more: they move at different speeds). */
export function CameraSelect({
  motion,
  asset,
  onChange,
}: {
  motion: Cinematic;
  asset?: MediaAsset;
  onChange: (motion: Cinematic) => void;
}) {
  const { t } = useTranslation();
  return (
    <PresetCards
      label={t("editor.image.camera")}
      help={t("editor.image.cameraHint")}
      value={motion.preset}
      options={illustrationPresets}
      labels={(preset) => t(`editor.image.presets.${preset}`)}
      asset={asset}
      frames={(preset) => cinematicFrames({ ...motion, preset })}
      duration={(preset) => cinematicDuration(motion.speed, { ...motion, preset })}
      onChange={(preset) => onChange({ ...motion, preset })}
    />
  );
}

export function CinematicOptions({
  motion,
  onChange: setMotion,
}: {
  motion: Cinematic;
  onChange: (motion: Cinematic) => void;
}) {
  return (
    <div className="preset-options">
      <Field
        label="Movement duration (seconds)"
        type="number"
        min="1"
        max="30"
        step=".5"
        value={motion.durationMs ? motion.durationMs / 1000 : ""}
        placeholder="Preset default"
        onChange={(event) =>
          setMotion({
            ...motion,
            durationMs: event.target.value ? Number(event.target.value) * 1000 : undefined,
          })
        }
      />
      {(["speed", "intensity", "direction", "atmosphere"] as const).map((field) => (
        <SelectField
          key={field}
          label={field}
          aria-label={`Cinematic ${field}`}
          value={motion[field]}
          onChange={(value) => setMotion({ ...motion, [field]: value })}
          options={
            {
              speed: cinematicSpeeds,
              intensity: cinematicIntensities,
              direction: cinematicDirections,
              atmosphere: atmospheres,
            }[field]
          }
        />
      ))}
    </div>
  );
}
