import { useTranslation } from "react-i18next";
import type { Illustration } from "../../contracts/illustration.ts";
import { illustrationRoles } from "../../contracts/illustration.ts";
import { CheckboxField, SelectField } from "./Fields.tsx";

type Placement = Illustration["base"];
type Slider = "scale" | "rotation" | "tiltX" | "tiltY" | "x" | "y";
const ranges: Record<Slider, [number, number, number]> = {
  scale: [0.2, 3, 0.05],
  rotation: [-180, 180, 1],
  tiltX: [-75, 75, 1],
  tiltY: [-75, 75, 1],
  x: [-75, 75, 1],
  y: [-75, 75, 1],
};

/** The selected picture: the usual size and turn, its actions, then tilt, flip and exact position. */
export function LayerTransform({
  layer,
  layered,
  name,
  onChange,
  onReplace,
  onDuplicate,
}: {
  layer: Placement;
  /** Depth only means something once there are several layers. */
  layered: boolean;
  name: string;
  onChange: (change: Partial<Placement>) => void;
  /** Opens the picker for another image in the same place and size. */
  onReplace: () => void;
  onDuplicate: () => void;
}) {
  const { t } = useTranslation();
  const slider = (field: Slider, label: string) => {
    const [min, max, step] = ranges[field];
    return (
      <label key={field}>
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
    );
  };
  return (
    <fieldset className="image-selected">
      <legend>
        {t("editor.image.selected")}: <strong>{name}</strong>
      </legend>
      <div className="image-selected-fields">
        {slider("scale", t("editor.image.size"))}
        {slider("rotation", t("editor.image.turn"))}
        {layered && (
          <SelectField
            label={t("editor.image.depthLabel")}
            value={layer.role}
            options={illustrationRoles}
            labels={{
              foreground: t("editor.image.depth.foreground"),
              midground: t("editor.image.depth.midground"),
              background: t("editor.image.depth.background"),
            }}
            onChange={(role) => onChange({ role })}
          />
        )}
      </div>
      <div className="image-selected-actions">
        <button type="button" onClick={onReplace}>
          {t("editor.image.replace")}
        </button>
        <button type="button" onClick={onDuplicate}>
          {t("editor.image.duplicate")}
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({
              x: 0,
              y: 0,
              scale: 1,
              rotation: 0,
              tiltX: undefined,
              tiltY: undefined,
              flip: undefined,
            })
          }
        >
          {t("editor.image.reset")}
        </button>
      </div>
      <details className="image-selected-more">
        <summary>{t("editor.image.tiltSection")}</summary>
        <div className="image-selected-fields">
          {slider("tiltX", t("editor.image.tiltX"))}
          {slider("tiltY", t("editor.image.tiltY"))}
          {slider("x", t("editor.image.x"))}
          {slider("y", t("editor.image.y"))}
          <CheckboxField
            label={t("editor.image.flip")}
            checked={layer.flip ?? false}
            onChange={(event) => onChange({ flip: event.target.checked })}
          />
        </div>
      </details>
    </fieldset>
  );
}
