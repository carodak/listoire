import { createPortal } from "react-dom";
import { useState } from "react";
import type { ReactNode } from "react";
import type { Illustration } from "../../contracts/illustration.ts";
import { illustrationRoles } from "../../contracts/illustration.ts";
import type { StoryProject } from "../../contracts/editor-project.ts";
import type { Cinematic } from "../../contracts/cinematic.ts";
import { MediaLibrary, VisualPreview } from "./MediaLibrary.tsx";
import { CompositionPreview } from "./IllustrationPreview.tsx";
import { LayerTransform } from "./LayerTransform.tsx";
interface Props {
  image: string;
  value: Illustration;
  language: StoryProject["languages"][string];
  library: StoryProject["mediaLibrary"];
  motion: Cinematic;
  layout: string;
  layered: boolean;
  previewTarget?: HTMLElement | null;
  onChange: (value: Illustration) => void;
}
export function ImageLayers(props: Props) {
  const { image, value, language, library, motion, layout, layered, onChange } = props;
  const [selected, select] = useState(-1),
    [margins, showMargins] = useState(false);
  const [gallery, setGallery] = useState<Illustration["base"]["role"] | null>(null);
  const layer = selected < 0 ? value.base : (value.layers[selected] ?? value.base);
  const update = (patch: Partial<Illustration["base"]>) =>
    onChange(
      selected < 0
        ? { ...value, base: { ...value.base, ...patch } }
        : {
            ...value,
            layers: value.layers.map((item, index) =>
              index === selected ? { ...item, ...patch } : item,
            ),
          },
    );
  const preview = (
    <>
      <ImageDragStage layer={layer} onChange={update}>
        <CompositionPreview
          image={image}
          value={value}
          assets={language.configuration.assets ?? []}
          paper={language.defaults.backgroundColor}
          motion={motion}
          layout={layout}
          margins={margins}
        />
      </ImageDragStage>
      <label
        className="check"
        title="Check the inset frame for exposed edges before applying camera movement."
      >
        <input
          type="checkbox"
          checked={margins}
          onChange={(event) => showMargins(event.target.checked)}
        />
        Show crop / safe margins
      </label>
    </>
  );
  return (
    <>
      {props.previewTarget ? createPortal(preview, props.previewTarget) : preview}
      {layered && (
        <>
          <LayerList
            image={image}
            value={value}
            assets={language.configuration.assets ?? []}
            selected={selected}
            onSelect={select}
            onRemove={(index) => {
              onChange({ ...value, layers: value.layers.filter((_, at) => at !== index) });
              select(-1);
            }}
          />
          <div className="layer-gallery-actions">
            {illustrationRoles.map((role) => (
              <button
                type="button"
                key={role}
                disabled={value.layers.length >= 11}
                onClick={() => setGallery(role)}
              >
                + {role === "midground" ? "Middleground / character" : role}
              </button>
            ))}
          </div>
        </>
      )}
      <LayerTransform layer={layer} onChange={update} />
      {gallery && (
        <MediaLibrary
          key={gallery}
          embedded
          language={language}
          library={library ?? []}
          kind="image"
          role={gallery}
          onChoose={(id) => {
            onChange({
              ...value,
              layers: [...value.layers, { image: id, role: gallery, x: 0, y: 0, scale: 1 }],
            });
            select(value.layers.length);
          }}
          onClose={() => setGallery(null)}
        />
      )}
    </>
  );
}
interface ImageDragStageProps {
  layer: Illustration["base"];
  onChange: (change: Partial<Illustration["base"]>) => void;
  children: ReactNode;
}

function ImageDragStage({ layer, onChange, children }: ImageDragStageProps) {
  return (
    <div
      className="illustration-drag-stage"
      title="Drag to move the selected image; use the sliders for precise size and rotation."
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest("button")) return;
        const node = event.currentTarget,
          rect = node.getBoundingClientRect(),
          origin = { ...layer },
          start = { x: event.clientX, y: event.clientY };
        node.setPointerCapture(event.pointerId);
        node.onpointermove = (move) =>
          onChange({
            x: Math.max(
              -75,
              Math.min(75, origin.x + ((move.clientX - start.x) / rect.width) * 100),
            ),
            y: Math.max(
              -75,
              Math.min(75, origin.y + ((move.clientY - start.y) / rect.height) * 100),
            ),
          });
        node.onpointerup = node.onpointercancel = () => {
          node.onpointermove = null;
          node.onpointerup = null;
          node.onpointercancel = null;
        };
      }}
    >
      {children}
    </div>
  );
}
interface LayerListProps {
  image: string;
  value: Illustration;
  assets: NonNullable<Props["language"]["configuration"]["assets"]>;
  selected: number;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
}

function LayerList({ image, value, assets, selected, onSelect, onRemove }: LayerListProps) {
  return (
    <div className="image-layer-list" aria-label="Image instances">
      {[{ image, ...value.base }, ...value.layers].map((item, index) => {
        const asset = assets.find((asset) => asset.id === item.image);
        return (
          <div key={index}>
            <button
              type="button"
              aria-pressed={selected === index - 1}
              onClick={() => onSelect(index - 1)}
            >
              {asset && <VisualPreview asset={asset} />}
              <span>
                {index === 0 ? "Base" : `${item.role} · ${index}`}
                <small>{asset?.alt || "Choose an image"}</small>
              </span>
            </button>
            {index > 0 && (
              <button
                type="button"
                aria-label={`Remove ${item.role} layer ${index}`}
                title="Remove this instance; the catalogue file remains unchanged."
                onClick={() => onRemove(index - 1)}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
