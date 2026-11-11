import { MediaLayout } from "./MediaLayout.tsx";
import { useState } from "react";
import type { ImageDraft, MediaEdit } from "./media-edit.ts";
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
  kind: string;
  draft: ImageDraft;
  onDraft: (patch: Partial<ImageDraft>) => void;
  segments: string[];
  locale: string;
  layout: MediaEdit["layout"];
  onLayout: (layout: MediaEdit["layout"]) => void;
}

/** The Image and Video fields, all from the typed draft. */
export function ImageFields(props: ImageFieldsProps) {
  const { kind, draft, onDraft, locale, layout, onLayout } = props;
  return (
    <>
      {kind !== "Image" && <MediaLayout layout={layout} onLayout={onLayout} />}
      {kind === "Image" && layout !== "fullscreen" && (
        <ExaminationFields
          value={draft.examination ?? null}
          onChange={(examination) => onDraft({ examination })}
          locale={locale}
        />
      )}
      <details>
        <summary>Size and positioning (optional)</summary>
        <ImagePlacement {...props} />
      </details>
      <Field
        label="Alt text"
        value={draft.alt}
        onChange={(event) => onDraft({ alt: event.target.value })}
      />
      <Field
        label="Caption"
        value={draft.caption}
        onChange={(event) => onDraft({ caption: event.target.value })}
      />
      <ImageTiming {...props} />
      {layout === "fullscreen" ? (
        <p>
          Cinematic images disappear with their effects when the cinematic ends. Persistence applies
          only to non-cinematic media.
        </p>
      ) : (
        <details>
          <summary>Hide automatically (optional)</summary>
          <DraftNumber
            {...props}
            field="persistence"
            label="Persistence in ms (0 = until next page)"
            max={180000}
          />
        </details>
      )}
      {kind === "Video" && (
        <p>
          Fullscreen video uses its reported duration, up to three minutes. The reader can skip it.
        </p>
      )}
    </>
  );
}
type NumberKey = "width" | "x" | "y" | "delay" | "persistence";
function DraftNumber({
  draft,
  onDraft,
  field,
  label,
  min = 0,
  max,
}: Pick<ImageFieldsProps, "draft" | "onDraft"> & {
  field: NumberKey;
  label: string;
  min?: number;
  max: number;
}) {
  return (
    <Field
      label={label}
      type="number"
      min={min}
      max={max}
      value={draft[field]}
      onChange={(event) => onDraft({ [field]: Number(event.target.value) })}
    />
  );
}
function PositionFields(props: DraftProps) {
  const { draft, onDraft } = props;
  return (
    <fieldset>
      <legend>Position</legend>
      <CheckboxField
        label="Override default position"
        checked={draft.positionOverride}
        onChange={(event) => onDraft({ positionOverride: event.target.checked })}
      />
      <p>Default: where this media command appears in the script.</p>
      {draft.positionOverride && (
        <>
          <DraftNumber {...props} field="x" label="X (%)" min={-100} max={100} />
          <DraftNumber {...props} field="y" label="Y (%)" min={-100} max={100} />
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

type DraftProps = Pick<ImageFieldsProps, "kind" | "draft" | "onDraft" | "segments">;
/** Width, offset and alignment on the page. */
export function ImagePlacement(props: DraftProps) {
  const { kind, draft, onDraft } = props;
  return (
    <>
      <DraftNumber {...props} field="width" label="Width (%)" min={10} max={100} />
      <PositionFields {...props} />
      <SelectField
        label="Alignment"
        value={draft.align}
        options={["left", "center", "right"] as const}
        onChange={(align) => onDraft({ align })}
      />
      {kind !== "Image" && (
        <SelectField
          label="Fit / crop"
          value={draft.fit}
          options={["contain", "cover"] as const}
          labels={{ contain: "Fit", cover: "Cover / crop" }}
          onChange={(fit) => onDraft({ fit })}
        />
      )}
    </>
  );
}

/** When the picture appears: with the page, at a line of text, or after a delay. */
export function ImageTiming(props: DraftProps) {
  const { draft, onDraft, segments } = props;
  return (
    <>
      <SelectField
        label="Show"
        value={draft.show}
        onChange={(show) => onDraft({ show })}
        options={["page", "segment", "delay"] as const}
        labels={{
          page: "When page appears",
          segment: "When narration or text reaches this element",
          delay: "After a delay",
        }}
      />
      {draft.show === "segment" && (
        <SelectField
          label="Text position"
          value={draft.segment}
          options={["", ...segments]}
          labels={{ "": "Choose a segment" }}
          onChange={(segment) => onDraft({ segment })}
        />
      )}
      {draft.show === "delay" && (
        <DraftNumber {...props} field="delay" label="Delay (ms)" max={10000} />
      )}
    </>
  );
}
