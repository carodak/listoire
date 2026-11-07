import { useState } from "react";
import type { Illustration } from "../../contracts/illustration.ts";
import { illustrationDefaults } from "../../contracts/illustration.ts";
import type { StoryProject } from "../../contracts/editor-project.ts";
import type { Cinematic } from "../../contracts/cinematic.ts";
import type { MediaEdit } from "./media-edit.ts";
import { MediaPicker } from "./MediaLibrary.tsx";
import { MediaLayout } from "./MediaLayout.tsx";
import { ImageLayers } from "./ImageLayers.tsx";
import { IllustrationStarters } from "./IllustrationStarters.tsx";
import { PageCompositionFields } from "./IllustrationPreview.tsx";
import "./image-composition.css";
interface Props {
  image: string;
  value: Illustration | null;
  onChange: (value: Illustration | null) => void;
  onImage: (id: string) => void;
  language: StoryProject["languages"][string];
  library: StoryProject["mediaLibrary"];
  motion: Cinematic;
  layout: MediaEdit["layout"];
  onLayout: (layout: MediaEdit["layout"]) => void;
  kind: string;
  previewTarget?: HTMLElement | null;
}
export function ImageComposition(props: Props) {
  const [mode, setMode] = useState(props.value?.layers.length ? "layered" : "single");
  if (props.kind !== "Image") return null;
  const { image, value, onChange, onImage, language, library, motion, layout, onLayout } = props;
  const current = value ?? illustrationDefaults();
  return (
    <fieldset className="image-composition">
      <legend>Illustration</legend>
      <input type="hidden" name="illustration" value={JSON.stringify(current)} />
      <IllustrationMode
        value={mode}
        onChange={(mode) => {
          setMode(mode);
          if (mode === "single") onChange({ ...current, layers: [] });
        }}
      />
      <MediaLayout layout={layout} onLayout={onLayout} />
      <MediaPicker
        language={language}
        embedded
        kind="Image"
        asset={image}
        library={library ?? []}
        onAsset={(id) => {
          onImage(id);
          onChange({
            ...current,
            base: illustrationDefaults(library?.find((entry) => entry.id === id)?.layerRoles?.[0])
              .base,
          });
        }}
      />
      {mode === "layered" && (
        <IllustrationStarters
          assets={language.configuration.assets ?? []}
          onApply={(image, value) => {
            onImage(image);
            onChange(value);
          }}
        />
      )}
      {image && (
        <>
          <ImageLayers
            key={mode}
            previewTarget={props.previewTarget}
            image={image}
            value={current}
            onChange={onChange}
            language={language}
            library={library}
            motion={motion}
            layout={layout}
            layered={mode === "layered"}
          />
          <PageCompositionFields value={current} onChange={onChange} layout={layout} />
        </>
      )}
    </fieldset>
  );
}
interface IllustrationModeProps {
  value: string;
  onChange: (value: string) => void;
}

function IllustrationMode({ value, onChange }: IllustrationModeProps) {
  return (
    <label
      className="illustration-mode-select"
      title="Single Image uses one catalogue asset. Layered Composition arranges independent image instances with depth."
    >
      Illustration
      <select
        aria-label="Illustration mode"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="single">Single Image</option>
        <option value="layered">Layered Composition</option>
        <option value="auto" disabled>
          Auto Compose (future)
        </option>
      </select>
    </label>
  );
}
