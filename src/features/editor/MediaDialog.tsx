import { illustrationDefaults } from "../../contracts/illustration.ts";
import { MediaPicker } from "./MediaLibrary.tsx";
import { VideoUpload } from "./VideoUpload.tsx";
import { CinematicFields } from "./CinematicFields.tsx";
import { useState } from "react";
import type { StoryProject } from "../../contracts/editor-project.ts";
import { EditorDialog, EditorFormActions } from "./EditorDialog.tsx";
import { applyMediaEdit } from "./media-authoring.ts";
import { mediaDefaults, mediaContext } from "./media-form.ts";
import type { MediaEdit } from "./media-edit.ts";
import { ImageFields, AnimationFields, AudioFields, TimingFields } from "./MediaFields.tsx";
import { ImageComposition } from "./ImageComposition.tsx";

interface MediaDialogProps {
  kind: string;
  project: StoryProject;
  locale: string;
  passageId: string;
  selectedId?: string;
  onApply: (project: StoryProject, reference: string) => void;
  onClose: () => void;
}

type MediaForm = ReturnType<typeof initialForm>;
interface FormProps {
  kind: string;
  project: StoryProject;
  locale: string;
  form: MediaForm;
  initial: MediaEdit;
  context: ReturnType<typeof mediaContext>;
  patch: (patch: Partial<MediaForm>) => void;
  previewTarget: HTMLElement | null;
  selectedId?: string;
}
const mediaFields = {
  Image: ImageFields,
  Video: ImageFields,
  Animation: AnimationFields,
  "Sound Effect": AudioFields,
  "Background Music": AudioFields,
};
export function MediaDialog(props: MediaDialogProps) {
  const { kind, project, locale, passageId, selectedId, onApply, onClose } = props;
  const [form, setForm] = useState(() =>
    initialForm(kind, passageId, selectedId, project.languages[locale]!),
  );
  const [previewTarget, setPreviewTarget] = useState<HTMLDivElement | null>(null);
  const patch = (patch: Partial<MediaForm>) => setForm((before) => ({ ...before, ...patch }));
  const id = selectedId ?? form.newId;
  const initial = mediaDefaults(
    kind,
    form.sceneId,
    id,
    form.language.configuration.scenes?.[form.sceneId],
  );
  const context = mediaContext(form.language, form.sceneId, form.asset, selectedId);
  function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const data = new FormData(event.currentTarget);
      const input = readMediaForm(initial, data);
      const next = commitMedia(
        project,
        locale,
        form.language,
        input,
        context.segmentIds,
        String(data.get("trigger") ?? "passage"),
      );
      onApply(next, `// @media ${form.sceneId}/${id}\n`);
      onClose();
    } catch (error) {
      patch({ error: error instanceof Error ? error.message : String(error) });
    }
  }
  const fields: FormProps = { ...props, form, initial, context, patch, previewTarget };
  return (
    <EditorDialog title={`${selectedId ? "Edit" : "Add"} ${kind}`} onClose={onClose}>
      <form onSubmit={apply} key={form.sceneId}>
        <fieldset className="media-dialog-fields" data-image={kind === "Image"}>
          <div className="media-settings-column">
            <MediaInputs {...fields} />
            <MediaConfiguration {...fields} />
          </div>
          {kind === "Image" && (
            <aside className="media-preview-column" aria-label="Illustration preview">
              <h3>Live preview</h3>
              {!form.asset && <p>Choose an image or a composition preset to preview it here.</p>}
              <div ref={setPreviewTarget} />
            </aside>
          )}
        </fieldset>
        {form.error && <p role="alert">{form.error}</p>}
        <EditorFormActions onClose={onClose}>Apply {kind}</EditorFormActions>
      </form>
    </EditorDialog>
  );
}
function MediaInputs({ kind, project, form, patch, previewTarget, selectedId }: FormProps) {
  const scenes = Object.keys(form.language.configuration.scenes ?? {});
  return (
    <>
      <label className="media-scene-select">
        Scene
        <select
          aria-label="Scene"
          value={form.sceneId}
          disabled={Boolean(selectedId)}
          onChange={(event) => patch({ sceneId: event.target.value })}
        >
          {Array.from(new Set([...scenes, form.sceneId])).map((id) => (
            <option key={id}>{id}</option>
          ))}
        </select>
      </label>
      <MediaSource
        kind={kind}
        language={form.language}
        setLanguage={(language) => patch({ language })}
        asset={form.asset}
        setAsset={(asset) => patch({ asset })}
        library={project.mediaLibrary}
      />
      <ImageComposition
        kind={kind}
        previewTarget={previewTarget}
        image={form.asset}
        value={form.illustration}
        onChange={(illustration) => patch({ illustration, motion: { ...form.motion, layers: [] } })}
        onImage={(asset) => patch({ asset })}
        language={form.language}
        library={project.mediaLibrary}
        motion={form.motion}
        layout={form.layout}
        onLayout={(layout) => patch({ layout })}
      />
    </>
  );
}
function MediaConfiguration({ kind, project, locale, form, initial, context, patch }: FormProps) {
  const Fields = mediaFields[kind as keyof typeof mediaFields];
  const content = { input: initial, segments: context.segmentIds };
  return (
    <>
      <details className="media-placement-options" open>
        <summary>Story placement, timing &amp; size</summary>
        <Fields
          {...content}
          layout={form.layout}
          onLayout={(layout) => patch({ layout })}
          alt={context.alt}
          blocks={context.blocks}
          target={form.target}
          onTarget={(target) => patch({ target })}
          legacyExamination={form.language.configuration.examination}
          locale={locale}
        />
      </details>
      <CinematicFields
        kind={kind}
        motion={form.motion}
        image={context.assetUrl}
        layerCount={form.illustration?.layers.length ?? 0}
        simpleEffect={initial.effect}
        onChange={(motion) => patch({ motion })}
      />
      {!["Image", "Video"].includes(kind) && form.target !== "transition" && (
        <TimingFields {...content} blocks={context.blocks} trigger={context.trigger} />
      )}
      {kind === "Animation" && form.target === "transition" && (
        <p>Runs when the reader leaves this scene.</p>
      )}
      <label
        className="check media-shared-setting"
        title="Uncheck to override this language only. Change the default in Settings."
      >
        <input name="shared" type="checkbox" defaultChecked={project.shareConfiguration ?? false} />
        Apply shared configuration to all languages
      </label>
    </>
  );
}
function commitMedia(
  project: StoryProject,
  locale: string,
  language: StoryProject["languages"][string],
  input: MediaEdit,
  segments: string[],
  trigger: string,
) {
  if (input.kind === "Video")
    input.duration = Math.min(
      180000,
      language.configuration.assets?.find((asset) => asset.id === input.asset)?.upload
        ?.durationMs ?? 10000,
    );
  return applyMediaEdit(
    { ...project, languages: { ...project.languages, [locale]: language } },
    locale,
    input,
    segments,
    trigger,
  );
}
function readMediaForm(initial: MediaEdit, data: FormData): MediaEdit {
  return Object.fromEntries(
    Object.entries(initial).map(([key, value]) => {
      if (key === "motion" || key === "examination" || key === "illustration")
        return [
          key,
          data.has(key) ? JSON.parse(String(data.get(key))) : key === "examination" ? null : value,
        ];
      if (typeof value === "boolean") return [key, data.has(key)];
      if (!data.has(key)) return [key, value];
      return [key, typeof value === "number" ? Number(data.get(key)) : String(data.get(key))];
    }),
  ) as unknown as MediaEdit;
}
interface MediaSourceProps {
  kind: string;
  language: StoryProject["languages"][string];
  setLanguage: (value: StoryProject["languages"][string]) => void;
  asset: string;
  setAsset: (id: string) => void;
  library: StoryProject["mediaLibrary"];
}

function MediaSource({ kind, language, setLanguage, asset, setAsset, library }: MediaSourceProps) {
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
      {!["Image", "Animation"].includes(kind) && (
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

function initialForm(
  kind: string,
  sceneId: string,
  selectedId: string | undefined,
  language: StoryProject["languages"][string],
) {
  const defaults = mediaDefaults(
    kind,
    sceneId,
    selectedId ?? "",
    language.configuration.scenes?.[sceneId],
  );
  return {
    language,
    sceneId,
    asset: defaults.asset,
    error: "",
    target: defaults.target,
    layout: defaults.layout,
    motion: defaults.motion,
    illustration: kind === "Image" ? (defaults.illustration ?? illustrationDefaults()) : null,
    newId: `${sceneId}.${kind === "Image" ? "image" : "cue"}-${crypto.randomUUID()}`,
  };
}
