import { MediaLayout } from "./MediaLayout.tsx";
import { useState } from "react";
import type { MediaEdit } from "./media-edit.ts";
import { ExaminationFields } from "./ExaminationFields.tsx";
import { animationOptions } from "./animation-options.ts";
import { CheckboxField, Field, SelectField } from "./Fields.tsx";
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
    <Field
      label={label}
      name={name}
      type="number"
      min={min}
      max={max}
      step={step}
      defaultValue={value}
    />
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
      <Field label="Alt text" name="alt" defaultValue={alt} />
      <Field label="Caption" name="caption" defaultValue={input.caption} />
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
      <CheckboxField
        label="Override default position"
        name="positionOverride"
        checked={override}
        onChange={(event) => setOverride(event.target.checked)}
      />
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
      <SelectField
        label="Target"
        name="target"
        value={target}
        onChange={onTarget}
        options={["page", "transition", ...blocks, ...segments]}
        labels={{
          page: "Scene",
          transition: "Scene Transition",
          ...Object.fromEntries(blocks.map((id) => [id, `Image: ${id}`])),
          ...Object.fromEntries(segments.map((id) => [id, `Text: ${id}`])),
        }}
      />
      <SelectField
        label="Animation"
        name="effect"
        value={selectedEffect}
        onChange={setEffect}
        options={effects}
      />
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
      <CheckboxField label="Loop" name="loop" defaultChecked={input.loop} />
      <CheckboxField label="Stop channel" name="stop" defaultChecked={input.stop} />
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
      <SelectField
        label="Show / trigger"
        name="trigger"
        value={when}
        onChange={setWhen}
        options={["passage", "segment", "block"]}
        labels={{
          passage: "When page appears",
          segment: "When narration or text reaches this element",
          block: "When target image appears",
        }}
      />
      {when === "segment" && (
        <SelectField
          label="Text position"
          name="segment"
          defaultValue={input.segment}
          options={["", ...segments]}
          labels={{ "": "Choose a segment" }}
        />
      )}
      {when === "block" && input.kind !== "Animation" && (
        <SelectField
          label="Target image"
          name="target"
          defaultValue={input.target}
          required
          options={["", ...blocks]}
          labels={{ "": "Choose an image" }}
        />
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
      <SelectField
        label="Alignment"
        name="align"
        defaultValue={input.align}
        options={["left", "center", "right"]}
      />
      {input.kind !== "Image" && (
        <SelectField
          label="Fit / crop"
          name="fit"
          defaultValue={input.fit}
          options={["contain", "cover"]}
          labels={{ contain: "Fit", cover: "Cover / crop" }}
        />
      )}
    </details>
  );
}

function ImageTiming({ input, segments }: { input: MediaEdit; segments: string[] }) {
  const [show, setShow] = useState(input.show);
  return (
    <>
      <SelectField
        label="Show"
        name="show"
        value={show}
        onChange={setShow}
        options={["page", "segment", "delay"] as const}
        labels={{
          page: "When page appears",
          segment: "When narration or text reaches this element",
          delay: "After a delay",
        }}
      />
      {show === "segment" && (
        <SelectField
          label="Text position"
          name="segment"
          defaultValue={input.segment}
          options={["", ...segments]}
          labels={{ "": "Choose a segment" }}
        />
      )}
      {show === "delay" && (
        <NumberField name="delay" label="Delay (ms)" max={10000} value={input.delay} />
      )}
    </>
  );
}
