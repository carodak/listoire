import { MediaPicker } from "./MediaLibrary.tsx";
import { animationOptions } from "./animation-options.ts";
import { VideoUpload } from "./VideoUpload.tsx";
import { CinematicFields } from "./CinematicFields.tsx";
import { useState } from "react";
import type { StoryProject } from "../../contracts/editor-project.ts";
import { EditorDialog } from "./EditorDialog.tsx";
import { applyMediaEdit, mediaDefaults, mediaContext } from "./media-authoring.ts";
import type { MediaEdit } from "./media-authoring.ts";

export function MediaDialog({
  kind,
  project,
  locale,
  passageId,
  selectedId,
  onApply,
  onClose,
}: {
  kind: string;
  project: StoryProject;
  locale: string;
  passageId: string;
  selectedId?: string;
  onApply: (project: StoryProject, reference: string) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(() => {
    const defaults = mediaDefaults(
      kind,
      passageId,
      selectedId ?? "",
      project.languages[locale]!.configuration.scenes?.[passageId],
    );
    return {
      language: project.languages[locale]!,
      sceneId: passageId,
      asset: defaults.asset,
      error: "",
      target: defaults.target,
      newId: `${passageId}.${kind === "Image" ? "image" : "cue"}-${crypto.randomUUID()}`,
    };
  });
  const { language, sceneId, asset, error, target, newId } = form;
  const scenes = language.configuration.scenes ?? {};
  const patch = (change: Partial<typeof form>) => setForm((before) => ({ ...before, ...change }));
  const setLanguage = (language: typeof form.language) => patch({ language });
  const setSceneId = (sceneId: string) => patch({ sceneId });
  const setAsset = (asset: string) => patch({ asset });
  const setError = (error: string) => patch({ error });
  const setTarget = (target: string) => patch({ target });
  const scene = scenes[sceneId];
  const id = selectedId ?? newId;
  const initial = mediaDefaults(kind, sceneId, id, scene);
  const {
    segmentIds,
    alt: defaultAlt,
    assetUrl,
    blocks,
    trigger,
  } = mediaContext(language, sceneId, asset, selectedId);
  function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const data = new FormData(event.currentTarget);
      const input = readMediaForm(initial, data);
      if (kind === "Video")
        input.duration = Math.min(
          180000,
          language.configuration.assets?.find((asset) => asset.id === input.asset)?.upload
            ?.durationMs ?? 10000,
        );
      const next = applyMediaEdit(
        { ...project, languages: { ...project.languages, [locale]: language } },
        locale,
        input,
        segmentIds,
        String(data.get("trigger") ?? "passage"),
      );
      onApply(next, `// @media ${sceneId}/${id}\n`);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }
  const content = { input: initial, segments: segmentIds };
  const Fields = {
    Image: ImageFields,
    Video: ImageFields,
    Animation: AnimationFields,
    "Sound Effect": AudioFields,
    "Background Music": AudioFields,
  }[kind]!;
  return (
    <EditorDialog title={`${selectedId ? "Edit" : "Add"} ${kind}`} onClose={onClose}>
      <form onSubmit={apply} key={sceneId}>
        <label>
          Scene
          <select
            aria-label="Scene"
            value={sceneId}
            disabled={Boolean(selectedId)}
            onChange={(e) => setSceneId(e.target.value)}
          >
            {Array.from(new Set([...Object.keys(scenes), sceneId])).map((id) => (
              <option key={id}>{id}</option>
            ))}
          </select>
        </label>
        <MediaSource
          kind={kind}
          language={language}
          setLanguage={setLanguage}
          asset={asset}
          setAsset={setAsset}
          library={project.mediaLibrary}
        />
        <Fields
          {...content}
          alt={defaultAlt}
          blocks={blocks}
          target={target}
          onTarget={setTarget}
        />
        {kind === "Image" && (
          <CinematicFields
            initial={initial.motion}
            language={language}
            quick={Boolean(selectedId)}
            image={assetUrl}
          />
        )}
        {!["Image", "Video"].includes(kind) && target !== "transition" && (
          <TimingFields {...content} trigger={trigger} />
        )}
        {kind === "Animation" && target === "transition" && (
          <p>Runs when the reader leaves this scene.</p>
        )}
        <label className="check">
          <input name="shared" type="checkbox" />
          Apply shared configuration to all languages
        </label>
        {error && <p role="alert">{error}</p>}
        <footer>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" type="submit">
            Apply {kind}
          </button>
        </footer>
      </form>
    </EditorDialog>
  );
}

function NumberField({
  name,
  label,
  value,
  max,
  min = 0,
  step = 1,
}: {
  name: string;
  label: string;
  value: number;
  max: number;
  min?: number;
  step?: number;
}) {
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
function ImageFields({
  input,
  segments,
  alt,
}: {
  input: MediaEdit;
  segments: string[];
  alt: string;
}) {
  const mediaType = input.kind === "Video" ? "Video" : "Image";
  return (
    <>
      <label>
        Type
        <select aria-label="Type" name="layout" defaultValue={input.layout}>
          <option value="inline">{mediaType} Inline</option>
          <option value="wide">{mediaType} Wide</option>
          <option value="right">{mediaType} Right page</option>
          <option value="background">{mediaType} Background</option>
          <option value="fullscreen">Cinematic {mediaType}</option>
        </select>
      </label>
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
      <label>
        Fit / crop
        <select name="fit" defaultValue={input.fit}>
          <option value="contain">Fit</option>
          <option value="cover">Cover / crop</option>
        </select>
      </label>
      <label>
        Alt text
        <input name="alt" defaultValue={alt} />
      </label>
      <label>
        Caption
        <input name="caption" defaultValue={input.caption} />
      </label>
      <label>
        Show
        <select name="show" defaultValue={input.show}>
          <option value="page">When page appears</option>
          <option value="segment">When narration or text reaches this element</option>
          <option value="delay">After a delay</option>
        </select>
      </label>
      <SegmentField segments={segments} value={input.segment} />
      <NumberField name="delay" label="Delay (ms)" max={10000} value={input.delay} />
      <NumberField
        name="persistence"
        label="Persistence in ms (0 = until next page)"
        max={180000}
        value={input.persistence}
      />
      {input.kind !== "Video" && (
        <NumberField
          name="duration"
          label="Cinematic duration (ms)"
          max={10000}
          value={input.duration}
        />
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
function AnimationFields({
  input,
  blocks,
  segments,
  target,
  onTarget,
}: {
  input: MediaEdit;
  blocks: string[];
  segments: string[];
  target: string;
  onTarget: (target: string) => void;
}) {
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
function AudioFields({ input }: { input: MediaEdit }) {
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
function TimingFields({
  input,
  segments,
  trigger,
}: {
  input: MediaEdit;
  segments: string[];
  trigger: string;
}) {
  return (
    <>
      <label>
        Show / trigger
        <select name="trigger" defaultValue={trigger}>
          <option value="passage">When page appears</option>
          <option value="segment">When narration or text reaches this element</option>
          <option value="block">When target image appears</option>
        </select>
      </label>
      <SegmentField segments={segments} value={input.segment} />
      <NumberField name="delay" label="Delay (ms)" max={10000} value={input.delay} />
    </>
  );
}

function readMediaForm(initial: MediaEdit, data: FormData): MediaEdit {
  return Object.fromEntries(
    Object.entries(initial).map(([key, value]) => {
      if (key === "motion") return [key, data.has(key) ? JSON.parse(String(data.get(key))) : value];
      if (typeof value === "boolean") return [key, data.has(key)];
      if (!data.has(key)) return [key, value];
      return [key, typeof value === "number" ? Number(data.get(key)) : String(data.get(key))];
    }),
  ) as unknown as MediaEdit;
}
function MediaSource({
  kind,
  language,
  setLanguage,
  asset,
  setAsset,
  library,
}: {
  kind: string;
  language: StoryProject["languages"][string];
  setLanguage: (value: StoryProject["languages"][string]) => void;
  asset: string;
  setAsset: (id: string) => void;
  library: StoryProject["mediaLibrary"];
}) {
  return (
    <>
      {kind === "Video" && (
        <VideoUpload
          onUpload={(asset) => {
            setLanguage({
              ...language,
              configuration: {
                ...language.configuration,
                assets: [
                  ...(language.configuration.assets ?? []).filter((item) => item.id !== asset.id),
                  asset,
                ],
              },
            });
            setAsset(asset.id);
          }}
        />
      )}
      {kind !== "Animation" && (
        <MediaPicker
          language={language}
          kind={kind}
          asset={asset}
          onAsset={setAsset}
          library={library ?? []}
        />
      )}
    </>
  );
}
