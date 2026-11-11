import { useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Illustration } from "../../contracts/illustration.ts";
import { illustrationDefaults } from "../../contracts/illustration.ts";
import type { StoryProject } from "../../contracts/editor-project.ts";
import type { Cinematic } from "../../contracts/cinematic.ts";
import type { ImageDraft, MediaEdit } from "./media-edit.ts";
import { MediaLayout } from "./MediaLayout.tsx";
import { ImageStage } from "./ImageLayers.tsx";
import { ImagePicker, pictureTitle } from "./ImagePicker.tsx";
import { PicturesPanel } from "./PicturesPanel.tsx";
import { LayerTransform } from "./LayerTransform.tsx";
import { IllustrationStarters } from "./IllustrationStarters.tsx";
import { PageCompositionFields } from "./IllustrationPreview.tsx";
import { CameraSelect, CinematicOptions } from "./CinematicFields.tsx";
import { ExaminationFields } from "./ExaminationFields.tsx";
import { ImagePlacement, ImageTiming } from "./MediaFields.tsx";
import { Field, SelectField } from "./Fields.tsx";
import {
  addPicture,
  changePicture,
  duplicatePicture,
  movePicture,
  patchPicture,
  picturesOf,
  removePicture,
  shapeOf,
} from "./image-pictures.ts";
import type { Composition } from "./image-pictures.ts";
import "./image-composition.css";

type Language = StoryProject["languages"][string];
type Role = Illustration["base"]["role"];
interface ImageForm {
  language: Language;
  sceneId: string;
  asset: string;
  layout: MediaEdit["layout"];
  motion: Cinematic;
  illustration: Illustration | null;
  draft: ImageDraft;
}
interface ImageEditorProps {
  form: ImageForm;
  /** Sets the main picture (its description follows it). */
  onAsset: (asset: string, change?: Partial<ImageForm>) => void;
  patch: (change: Partial<ImageForm>) => void;
  library: NonNullable<StoryProject["mediaLibrary"]>;
  locale: string;
  segments: string[];
  /** Scenes an image can be added to; editing an existing image keeps its scene. */
  scenes?: string[];
}
/** What the picker is for: a layer's image (the first one included), or a new layer. */
type Picking = { change: number } | { layer: true };

/** The Image dialog: pictures by depth, the live preview, and the few settings most images need. */
export function ImageEditor(props: ImageEditorProps) {
  const { form, patch, library, onAsset } = props;
  const { t } = useTranslation();
  const [selected, select] = useState(-1);
  const [picking, setPicking] = useState<Picking | null>(null);
  const [starters, showStarters] = useState(false);
  // Pictures hidden in the preview only (never stored).
  const [hidden, setHidden] = useState<number[]>([]);
  // A single image's frame follows the image's shape until the author picks a frame.
  const [frameChosen, setFrameChosen] = useState(false);
  // The last removal, until something else changes: Undo puts the image back.
  const [removed, setRemoved] = useState<{
    before: Composition;
    index: number;
    name: string;
    hidden: number[];
  } | null>(null);
  const value = form.illustration ?? illustrationDefaults();
  const assets = form.language.configuration.assets ?? [];
  const title = (id: string) => pictureTitle(id, assets, library);
  const pictures = picturesOf({ image: form.asset, value });
  const picture = pictures.find((item) => item.index === selected) ?? pictures[0]!;
  // A new composition drops the legacy camera layers, as the old dialog did.
  const setValue = (illustration: Illustration) => {
    setRemoved(null);
    patch({ illustration, motion: { ...form.motion, layers: [] } });
  };
  const apply = (next: Composition & { index?: number }) => {
    setRemoved(null);
    const shape = shapeOf(assets.find((asset) => asset.id === next.image));
    if (!next.value.layers.length && !frameChosen && shape && next.image !== form.asset)
      next = { ...next, value: { ...next.value, aspect: shape } };
    if (next.image !== form.asset)
      onAsset(next.image, { illustration: next.value, motion: { ...form.motion, layers: [] } });
    else setValue(next.value);
    select(next.index ?? -1);
  };
  const remove = (index: number) => {
    const before = { image: form.asset, value };
    const name = title(pictures.find((item) => item.index === index)!.image);
    apply(removePicture(before, index));
    setRemoved({ before, index, name, hidden });
    // The pictures after it move up one place (the next one becomes the main one).
    setHidden(hidden.filter((at) => at !== index).map((at) => (at > index ? at - 1 : at)));
  };
  const undo = () => {
    if (!removed) return;
    apply({ ...removed.before, index: removed.index });
    setHidden(removed.hidden);
  };
  // A new image takes the depth its catalogue entry suggests (scenery at the back…).
  const depth = (id: string, fallback: Role) =>
    library.find((entry) => entry.id === id)?.layerRoles?.[0] ?? fallback;
  const choose = (id: string) => {
    const composition = { image: form.asset, value };
    setPicking(null);
    if (!picking) return;
    if (!form.asset) return apply(addPicture(composition, id, depth(id, "background")));
    if ("layer" in picking) return apply(addPicture(composition, id, depth(id, "foreground")));
    apply({ ...changePicture(composition, picking.change, id), index: picking.change });
  };
  const pickerTitle = !picking
    ? ""
    : "layer" in picking
      ? t("editor.image.picker.layer")
      : t(form.asset ? "editor.image.picker.replace" : "editor.image.picker.first");
  return (
    <div
      className="image-editor"
      onKeyDown={(event) => {
        // Ctrl+Z undoes a removal (text fields keep their own undo).
        const field = (event.target as HTMLElement).closest("input, textarea, select");
        if (!removed || field || !(event.ctrlKey || event.metaKey) || event.key !== "z") return;
        event.preventDefault();
        undo();
      }}
    >
      <div className="image-editor-side">
        {picking ? (
          <ImagePicker
            title={pickerTitle}
            role={
              "change" in picking
                ? pictures.find((item) => item.index === picking.change)?.role
                : undefined
            }
            language={form.language}
            library={library}
            onChoose={choose}
            onClose={() => setPicking(null)}
          />
        ) : (
          <>
            <PicturesPanel
              pictures={pictures}
              assets={assets}
              selected={picture.index}
              hidden={hidden}
              title={title}
              onSelect={select}
              onToggle={(index) =>
                setHidden(
                  hidden.includes(index) ? hidden.filter((at) => at !== index) : [...hidden, index],
                )
              }
              onAddLayer={() => setPicking({ layer: true })}
              onMove={(index, role, target) => {
                const moved = movePicture(value, index, role, target);
                setValue(moved.value);
                select(moved.index);
                setHidden(hidden.map((at) => (at < 0 ? at : moved.order.indexOf(at))));
              }}
              onRemove={remove}
            />
            {removed && (
              <p role="status" className="image-removed">
                {t("editor.image.removed", { name: removed.name })}{" "}
                <button type="button" onClick={undo}>
                  {t("editor.image.undo")}
                </button>
              </p>
            )}
            {form.asset && (
              <LayerTransform
                layer={picture}
                layered={value.layers.length > 0}
                name={title(picture.image)}
                onChange={(change) => setValue(patchPicture(value, picture.index, change))}
                onReplace={() => setPicking({ change: picture.index })}
                onDuplicate={() =>
                  apply(duplicatePicture({ image: form.asset, value }, picture.index))
                }
              />
            )}
          </>
        )}
      </div>
      <div className="image-editor-main">
        {form.asset ? (
          <ImageStage
            image={form.asset}
            value={value}
            assets={assets}
            paper={form.language.defaults.backgroundColor}
            motion={form.motion}
            layout={form.layout}
            layer={picture}
            selected={picture.index}
            hidden={hidden}
            onRemove={() => remove(picture.index)}
            onLayerChange={(change) => setValue(patchPicture(value, picture.index, change))}
          />
        ) : (
          <section className="image-empty" aria-label={t("editor.image.empty.title")}>
            <h3>{t("editor.image.empty.title")}</h3>
            <button
              type="button"
              className="image-start"
              onClick={() => setPicking({ change: -1 })}
            >
              {t("editor.image.chooseFirst")}
            </button>
            <p>{t("editor.image.empty.hint")}</p>
            <button
              type="button"
              className="image-starters-toggle"
              aria-expanded={starters}
              title={t("editor.image.startersHint")}
              onClick={() => showStarters(!starters)}
            >
              {t("editor.image.groups.starters")}{" "}
              <span aria-hidden="true">{starters ? "▾" : "▸"}</span>
            </button>
            {starters && (
              <IllustrationStarters
                assets={assets}
                onApply={(image, next) => apply({ image, value: next })}
              />
            )}
          </section>
        )}
        <MediaLayout layout={form.layout} onLayout={(layout) => patch({ layout })} />
        {value.layers.length > 0 && (
          <CameraSelect motion={form.motion} onChange={(motion) => patch({ motion })} />
        )}
        <ImageSettings
          {...props}
          value={value}
          setValue={(next) => {
            if (next.aspect !== value.aspect) setFrameChosen(true);
            setValue(next);
          }}
        />
      </div>
    </div>
  );
}

/** A settings category, folded until opened; its summary says what is set inside. */
function Section({
  title,
  set = [],
  children,
}: {
  title: string;
  set?: (string | false | null | undefined)[];
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const items = set.filter((item): item is string => Boolean(item));
  return (
    <details className="image-section">
      <summary>
        {title}
        {items.length > 0 && (
          <small>
            {" · "}
            {t("editor.image.moreSet", {
              items: items.map((item) => t(`editor.image.set.${item}`)).join(", "),
            })}
          </small>
        )}
      </summary>
      {children}
    </details>
  );
}

/** Everything most images don't need, one folded section per category. */
function ImageSettings({
  form,
  patch,
  locale,
  segments,
  scenes,
  value,
  setValue,
}: ImageEditorProps & {
  value: Illustration;
  setValue: (value: Illustration) => void;
}) {
  const { t } = useTranslation();
  const { draft, layout } = form;
  const onDraft = (change: Partial<ImageDraft>) => patch({ draft: { ...draft, ...change } });
  const layered = value.layers.length > 0;
  const draftProps = { kind: "Image", draft, onDraft, segments };
  return (
    <>
      <Section
        title={t("editor.image.groups.description")}
        set={[
          draft.alt && "description",
          draft.caption && "caption",
          draft.examination && "examine",
        ]}
      >
        <Field
          label={t("editor.image.description")}
          help={t("editor.image.descriptionHint")}
          value={draft.alt}
          onChange={(event) => onDraft({ alt: event.target.value })}
        />
        <Field
          label={t("editor.image.caption")}
          value={draft.caption}
          onChange={(event) => onDraft({ caption: event.target.value })}
        />
        {layout !== "fullscreen" && (
          <ExaminationFields
            value={draft.examination ?? null}
            onChange={(examination) => onDraft({ examination })}
            locale={locale}
          />
        )}
      </Section>
      <Section
        title={t("editor.image.groups.when")}
        set={[
          draft.show !== "page" && "timing",
          draft.persistence > 0 && "hide",
          !layered && draft.effect !== "none" && "entrance",
        ]}
      >
        {scenes && (
          <SelectField
            label={t("editor.image.scene")}
            value={form.sceneId}
            options={scenes}
            onChange={(sceneId) => patch({ sceneId })}
          />
        )}
        <ImageTiming {...draftProps} />
        {layout !== "fullscreen" && (
          <Field
            label={t("editor.image.hideAfter")}
            type="number"
            min={0}
            max={180}
            step={0.5}
            value={draft.persistence / 1000}
            onChange={(event) =>
              onDraft({ persistence: Math.round(Number(event.target.value) * 1000) })
            }
          />
        )}
        {!layered && (
          <SelectField
            label={t("editor.image.entrance")}
            value={draft.effect as "none" | "fade-in" | "fade-out"}
            options={["none", "fade-in", "fade-out"] as const}
            labels={{
              none: t("editor.image.entrances.none"),
              "fade-in": t("editor.image.entrances.fade-in"),
              "fade-out": t("editor.image.entrances.fade-out"),
            }}
            onChange={(effect) => onDraft({ effect })}
          />
        )}
      </Section>
      <Section
        title={t("editor.image.groups.look")}
        set={[(draft.width !== 100 || draft.positionOverride || value.wrap !== "none") && "page"]}
      >
        <PageCompositionFields value={value} onChange={setValue} layout={layout} />
        <ImagePlacement {...draftProps} />
      </Section>
      {layered && (
        <Section title={t("editor.image.groups.cameraDetails")}>
          <CinematicOptions motion={form.motion} onChange={(motion) => patch({ motion })} />
        </Section>
      )}
    </>
  );
}
