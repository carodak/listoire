import { illustrationPresets, atmospheres } from "../../contracts/cinematic.ts";
import type { Cinematic } from "../../contracts/cinematic.ts";
interface CinematicFieldsProps {
  onChange: (motion: Cinematic) => void;
  kind?: string;
  motion: Cinematic;
  image?: string;
}

export function CinematicFields({
  motion,
  kind = "Image",
  image,
  onChange: setMotion,
}: CinematicFieldsProps) {
  if (kind !== "Image") return null;
  return (
    <fieldset className="cinematic-presets">
      <legend>Cinematic preset</legend>
      <input type="hidden" name="motion" value={JSON.stringify(motion)} />
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
      <label>
        Movement duration (seconds)
        <input
          aria-label="Movement duration (seconds)"
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
      </label>
      {(["speed", "intensity", "direction", "atmosphere"] as const).map((field) => (
        <label key={field}>
          {field}
          <select
            aria-label={`Cinematic ${field}`}
            value={motion[field]}
            onChange={(event) => setMotion({ ...motion, [field]: event.target.value })}
          >
            {{
              speed: ["slow", "normal", "fast"],
              intensity: ["subtle", "normal", "strong"],
              direction: ["auto", "up", "down", "left", "right"],
              atmosphere: atmospheres,
            }[field].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
