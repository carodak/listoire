import type { Illustration } from "../../contracts/illustration.ts";
import { illustrationRoles } from "../../contracts/illustration.ts";

const controls = [
  ["x", "Horizontal position (%)", -75, 75, 1],
  ["y", "Vertical position (%)", -75, 75, 1],
  ["scale", "Image scale", 0.2, 3, 0.05],
  ["rotation", "Rotation (degrees)", -180, 180, 1],
] as const;
interface LayerTransformProps {
  layer: Illustration["base"];
  onChange: (change: Partial<Illustration["base"]>) => void;
}

export function LayerTransform({ layer, onChange }: LayerTransformProps) {
  return (
    <fieldset className="image-crop-fields">
      <legend>Selected image</legend>
      <label title="Foreground moves most, middleground half as much, and background moves least.">
        Layer depth
        <select
          aria-label="Layer depth"
          value={layer.role}
          onChange={(event) => onChange({ role: event.target.value as typeof layer.role })}
        >
          {illustrationRoles.map((role) => (
            <option key={role}>{role}</option>
          ))}
        </select>
      </label>
      {controls.map(([field, label, min, max, step]) => (
        <label key={field} title={`Adjust only this image instance: ${label.toLowerCase()}.`}>
          {label}
          <input
            type="range"
            aria-label={label}
            min={min}
            max={max}
            step={step}
            value={layer[field] ?? 0}
            onChange={(event) => onChange({ [field]: Number(event.target.value) })}
          />
          <output>{layer[field] ?? 0}</output>
        </label>
      ))}
      <button type="button" onClick={() => onChange({ x: 0, y: 0, scale: 1, rotation: 0 })}>
        Reset selected image
      </button>
    </fieldset>
  );
}
