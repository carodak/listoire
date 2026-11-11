import { illustrationPresets, atmospheres } from "../../contracts/cinematic.ts";
import type { Cinematic } from "../../contracts/cinematic.ts";
import { useTranslation } from "react-i18next";
import { Field, SelectField } from "./Fields.tsx";
/** The camera, as a named list (two pictures or more: they move at different speeds). */
export function CameraSelect({
  motion,
  onChange,
}: {
  motion: Cinematic;
  onChange: (motion: Cinematic) => void;
}) {
  const { t } = useTranslation();
  return (
    <SelectField
      label={t("editor.image.camera")}
      help={t("editor.image.cameraHint")}
      value={motion.preset}
      options={illustrationPresets}
      labels={Object.fromEntries(
        illustrationPresets.map((preset) => [preset, t(`editor.image.presets.${preset}`)]),
      )}
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
              speed: ["slow", "normal", "fast"],
              intensity: ["subtle", "normal", "strong"],
              direction: ["auto", "up", "down", "left", "right"],
              atmosphere: atmospheres,
            }[field]
          }
        />
      ))}
    </div>
  );
}
