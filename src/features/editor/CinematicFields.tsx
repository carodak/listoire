import { useState } from "react";
import { cameraPresets, atmospheres } from "../../contracts/cinematic.ts";
import type { Cinematic } from "../../contracts/cinematic.ts";
import type { StoryProject } from "../../contracts/editor-project.ts";
import { cinematicFrames } from "../presentation/cinematic-presets.ts";
export function CinematicFields({
  initial,
  language,
  quick = false,
  image,
}: {
  initial: Cinematic;
  language: StoryProject["languages"][string];
  quick?: boolean;
  image?: string;
}) {
  const [motion, setMotion] = useState(initial);
  return (
    <fieldset className="cinematic-presets">
      <legend>Cinematic preset</legend>
      <input type="hidden" name="motion" value={JSON.stringify(motion)} />
      <div className="preset-grid">
        {cameraPresets.map((preset) => (
          <button
            type="button"
            aria-pressed={motion.preset === preset}
            key={preset}
            title={
              preset === "auto-parallax"
                ? "Uses elegant 2D drift when separated depth layers are unavailable."
                : `Apply ${preset.replaceAll("-", " ")} with tuned camera motion`
            }
            onMouseEnter={(event) => {
              const image = event.currentTarget.querySelector("img,span");
              if (image && !matchMedia("(prefers-reduced-motion: reduce)").matches)
                image.animate(cinematicFrames({ ...motion, preset }), {
                  duration: 1600,
                  easing: "ease-in-out",
                });
            }}
            onClick={(event) => {
              setMotion({ ...motion, preset });
              if (quick) {
                const form = event.currentTarget.form;
                requestAnimationFrame(() => form?.requestSubmit());
              }
            }}
          >
            <span aria-hidden="true">{image ? <img src={image} alt="" /> : "▧"}</span>
            {preset.replaceAll("-", " ")}
          </button>
        ))}
      </div>
      <div className="preset-options">
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
      {["parallax", "auto-parallax"].includes(motion.preset) && (
        <details>
          <summary>Depth layers (optional)</summary>
          <p>
            Single-image fallback: gentle 2D drift. For real depth, add transparent foreground
            images above the main background; depth follows the layer order. No AI runs during
            reading.
          </p>
          {motion.layers.map((id, index) => (
            <label key={index}>
              Layer {index + 1}
              <select
                value={id}
                onChange={(event) =>
                  setMotion({
                    ...motion,
                    layers: motion.layers.map((value, at) =>
                      at === index ? event.target.value : value,
                    ),
                  })
                }
              >
                {language.configuration.assets
                  ?.filter((asset) => asset.type === "image")
                  .map((asset) => (
                    <option
                      key={asset.id}
                      value={asset.id}
                      disabled={motion.layers.includes(asset.id) && asset.id !== id}
                    >
                      {asset.alt || asset.id}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  setMotion({ ...motion, layers: motion.layers.filter((_, at) => at !== index) })
                }
              >
                Remove layer
              </button>
              <button
                type="button"
                disabled={index === 0}
                onClick={() => {
                  const layers = [...motion.layers];
                  [layers[index - 1], layers[index]] = [layers[index]!, layers[index - 1]!];
                  setMotion({ ...motion, layers });
                }}
              >
                Move backward
              </button>
            </label>
          ))}
          <button
            type="button"
            disabled={motion.layers.length >= 4}
            onClick={() => {
              const asset = language.configuration.assets?.find(
                (asset) => asset.type === "image" && !motion.layers.includes(asset.id),
              );
              if (asset) setMotion({ ...motion, layers: [...motion.layers, asset.id] });
            }}
          >
            Add library layer
          </button>
        </details>
      )}
    </fieldset>
  );
}
