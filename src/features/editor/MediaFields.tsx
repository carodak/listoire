import { MediaLayout } from "./MediaLayout.tsx";
import { useState } from "react";
import type { MediaEdit } from "./media-edit.ts";
import { ExaminationFields } from "./ExaminationFields.tsx";
import { animationOptions } from "./animation-options.ts";
interface NumberFieldProps {
  name: string;
  label: string;
  value: number;
  max: number;
  min?: number;
  step?: number;
}

function NumberField({ name, label, value, max, min = 0, step = 1 }: NumberFieldProps) {
  return (
    <label>
      {label}
      <input name={name} type="number" min={min} max={max} step={step} defaultValue={value} />
    </label>
  );
}
function SegmentField({ segments, value }: { segments: string[]; value: string }) {
  return (
    <label>
      Text position
      <select name="segment" defaultValue={value}>
        <option value="">Choose a segment</option>
        {segments.map((id) => (
          <option key={id}>{id}</option>
        ))}
      </select>
    </label>
  );
}
interface ImageFieldsProps {
  input: MediaEdit;
  segments: string[];
  alt: string;
  legacyExamination?: MediaEdit["examination"];
  locale: string;
  layout: MediaEdit["layout"];
  onLayout: (layout: MediaEdit["layout"]) => void;
}

export function ImageFields({
  input,
  segments,
  alt,
  legacyExamination,
  locale,
  layout,
  onLayout,
}: ImageFieldsProps) {
  return (
    <>
      {input.kind !== "Image" && <MediaLayout layout={layout} onLayout={onLayout} />}
      {["Image", "3D Scene"].includes(input.kind) && layout !== "fullscreen" && (
        <ExaminationFields
          initial={
            (input.examination === undefined ? legacyExamination : input.examination) ?? null
          }
          locale={locale}
        />
      )}
      <ImagePlacement input={input} />
      <label>
        Alt text
        <input name="alt" defaultValue={alt} />
      </label>
      <label>
        Caption
        <input name="caption" defaultValue={input.caption} />
      </label>
      <ImageTiming input={input} segments={segments} />
      {layout === "fullscreen" ? (
        <p>
          Cinematic images disappear with their effects when the cinematic ends. Persistence applies
          only to non-cinematic media.
        </p>
      ) : (
        <details>
          <summary>Hide automatically (optional)</summary>
          <NumberField
            name="persistence"
            label="Persistence in ms (0 = until next page)"
            max={180000}
            value={input.persistence}
          />
        </details>
      )}
      {input.kind === "Video" && (
        <p>
          Fullscreen video uses its reported duration, up to three minutes. The reader can skip it.
        </p>
      )}
    </>
  );
}
function PositionFields({ input }: { input: MediaEdit }) {
  const [override, setOverride] = useState(input.positionOverride);
  return (
    <fieldset>
      <legend>Position</legend>
      <label className="check">
        <input
          type="checkbox"
          name="positionOverride"
          checked={override}
          onChange={(event) => setOverride(event.target.checked)}
        />
        Override default position
      </label>
      <p>Default: where this media command appears in the script.</p>
      {override && (
        <>
          <NumberField name="x" label="X (%)" min={-100} max={100} value={input.x} />
          <NumberField name="y" label="Y (%)" min={-100} max={100} value={input.y} />
        </>
      )}
    </fieldset>
  );
}
interface AnimationFieldsProps {
  input: MediaEdit;
  blocks: string[];
  segments: string[];
  target: string;
  onTarget: (target: string) => void;
}

export function AnimationFields({
  input,
  blocks,
  segments,
  target,
  onTarget,
}: AnimationFieldsProps) {
  const [effect, setEffect] = useState(input.effect);
  const effects = animationOptions(target, blocks);
  const selectedEffect = effects.includes(effect) ? effect : effects[0]!;
  return (
    <>
      <label>
        Target
        <select
          aria-label="Target"
          name="target"
          value={target}
          onChange={(e) => onTarget(e.target.value)}
        >
          <option value="page">Scene</option>
          <option value="transition">Scene Transition</option>
          {blocks.map((id) => (
            <option key={id} value={id}>
              Image: {id}
            </option>
          ))}
          {segments.map((id) => (
            <option key={id} value={id}>
              Text: {id}
            </option>
          ))}
        </select>
      </label>
      <label>
        Animation
        <select
          aria-label="Animation"
          name="effect"
          value={selectedEffect}
          onChange={(e) => setEffect(e.target.value)}
        >
          {effects.map((id) => (
            <option key={id}>{id}</option>
          ))}
        </select>
      </label>
      <NumberField name="duration" label="Duration (ms)" max={10000} value={input.duration} />
      <NumberField name="intensity" label="Intensity" max={1} step={0.05} value={input.intensity} />
    </>
  );
}
export function AudioFields({ input }: { input: MediaEdit }) {
  return (
    <>
      <NumberField name="volume" label="Volume" max={1} step={0.05} value={input.volume} />
      <NumberField name="fade" label="Fade / crossfade (ms)" max={3000} value={input.fade} />
      <label className="check">
        <input type="checkbox" name="loop" defaultChecked={input.loop} />
        Loop
      </label>
      <label className="check">
        <input type="checkbox" name="stop" defaultChecked={input.stop} />
        Stop channel
      </label>
    </>
  );
}
interface TimingFieldsProps {
  input: MediaEdit;
  segments: string[];
  trigger: string;
  blocks: string[];
}

export function TimingFields({ input, segments, trigger, blocks }: TimingFieldsProps) {
  const [when, setWhen] = useState(trigger);
  return (
    <>
      <label>
        Show / trigger
        <select name="trigger" value={when} onChange={(event) => setWhen(event.target.value)}>
          <option value="passage">When page appears</option>
          <option value="segment">When narration or text reaches this element</option>
          <option value="block">When target image appears</option>
        </select>
      </label>
      {when === "segment" && <SegmentField segments={segments} value={input.segment} />}
      {when === "block" && input.kind !== "Animation" && (
        <label>
          Target image
          <select name="target" defaultValue={input.target} required>
            <option value="">Choose an image</option>
            {blocks.map((id) => (
              <option key={id}>{id}</option>
            ))}
          </select>
        </label>
      )}
      <NumberField name="delay" label="Delay (ms)" max={10000} value={input.delay} />
    </>
  );
}

function ImagePlacement({ input }: { input: MediaEdit }) {
  return (
    <details>
      <summary>Size and positioning (optional)</summary>{" "}
      <NumberField name="width" label="Width (%)" min={10} max={100} value={input.width} />
      <PositionFields input={input} />
      <label>
        Alignment
        <select name="align" defaultValue={input.align}>
          {["left", "center", "right"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      {input.kind !== "Image" && (
        <label>
          Fit / crop
          <select name="fit" defaultValue={input.fit}>
            <option value="contain">Fit</option>
            <option value="cover">Cover / crop</option>
          </select>
        </label>
      )}
    </details>
  );
}

function ImageTiming({ input, segments }: { input: MediaEdit; segments: string[] }) {
  const [show, setShow] = useState(input.show);
  return (
    <>
      <label>
        Show
        <select
          name="show"
          value={show}
          onChange={(event) => setShow(event.target.value as typeof show)}
        >
          <option value="page">When page appears</option>
          <option value="segment">When narration or text reaches this element</option>
          <option value="delay">After a delay</option>
        </select>
      </label>
      {show === "segment" && <SegmentField segments={segments} value={input.segment} />}
      {show === "delay" && (
        <NumberField name="delay" label="Delay (ms)" max={10000} value={input.delay} />
      )}
    </>
  );
}
