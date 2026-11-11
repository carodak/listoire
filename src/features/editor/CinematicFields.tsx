import { illustrationPresets, atmospheres } from "../../contracts/cinematic.ts";
import type { Cinematic } from "../../contracts/cinematic.ts";
import { Field, SelectField } from "./Fields.tsx";
interface CinematicFieldsProps {
  onChange: (motion: Cinematic) => void;
  kind?: string;
  motion: Cinematic;
  image?: string;
  layerCount?: number;
  /** A single image's entrance (none, fade in, fade out). */
  effect: string;
  onEffect: (effect: "none" | "fade-in" | "fade-out") => void;
}

export function CinematicFields({
  motion,
  kind = "Image",
  image,
  layerCount = 0,
  effect,
  onEffect,
  onChange: setMotion,
}: CinematicFieldsProps) {
  if (kind !== "Image") return null;
  if (!layerCount) {
    return (
      <fieldset className="cinematic-presets" aria-label="Single image effects">
        <legend>Image appearance</legend>
        <p className="editor-hint">
          A single illustration stays still: no parallax or cinematic camera. Choose a subtle
          entrance effect below. Add separate image layers to unlock camera presets.
        </p>
        <SelectField
          label="Simple effect"
          value={effect as "none" | "fade-in" | "fade-out"}
          onChange={onEffect}
          options={["none", "fade-in", "fade-out"] as const}
          labels={{ none: "None", "fade-in": "Fade in", "fade-out": "Fade out" }}
        />
      </fieldset>
    );
  }
  return (
    <fieldset className="cinematic-presets">
      <legend>Cinematic preset</legend>
      <p className="editor-hint">
        Use None for a still illustration. Separated image layers share a perspective camera:
        foreground 1×, middleground 0.5×, background 0.15×.
      </p>
      <div className="preset-grid">
        {illustrationPresets.map((preset) => (
          <button
            type="button"
            aria-pressed={motion.preset === preset}
            key={preset}
            title={`Apply ${preset.replaceAll("-", " ")}; preview the movement below.`}
            onClick={() => {
              setMotion({ ...motion, preset });
            }}
          >
            <span aria-hidden="true">{image ? <img src={image} alt="" /> : "▧"}</span>
            {preset.replaceAll("-", " ")}
          </button>
        ))}
      </div>
      <CinematicOptions motion={motion} onChange={setMotion} />
    </fieldset>
  );
}

function CinematicOptions({
  motion,
  onChange: setMotion,
}: Pick<CinematicFieldsProps, "motion" | "onChange">) {
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
