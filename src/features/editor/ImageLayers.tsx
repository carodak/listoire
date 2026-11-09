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
import { CheckboxField } from "./Fields.tsx";
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
  const { image, value, language, library, layered, onChange } = props;
  const [selected, select] = useState(-1);
  const [gallery, setGallery] = useState<Illustration["base"]["role"] | null>(null);
  const layer = selected < 0 ? value.base : (value.layers[selected] ?? value.base);
  const update = (patch: Partial<Illustration["base"]>) =>
    onChange(patchLayer(value, selected, patch));
  const [margins, showMargins] = useState(false);
  const preview = (
    <CompositionStage
      {...props}
      layer={layer}
      onLayerChange={update}
      margins={margins}
      onMargins={showMargins}
    />
  );
  return (
    <>
      {props.previewTarget ? createPortal(preview, props.previewTarget) : preview}
      {layered && (
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
          onAdd={setGallery}
        />
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
function patchLayer(
  value: Illustration,
  selected: number,
  patch: Partial<Illustration["base"]>,
): Illustration {
  if (selected < 0) return { ...value, base: { ...value.base, ...patch } };
  return {
    ...value,
    layers: value.layers.map((item, index) => (index === selected ? { ...item, ...patch } : item)),
  };
}

function CompositionStage({
  image,
  value,
  language,
  motion,
  layout,
  layer,
  onLayerChange,
  margins,
  onMargins,
}: Props & {
  margins: boolean;
  onMargins: (show: boolean) => void;
  layer: Illustration["base"];
  onLayerChange: (patch: Partial<Illustration["base"]>) => void;
}) {
  return (
    <>
      <ImageDragStage layer={layer} onChange={onLayerChange}>
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
      <CheckboxField
        label="Show crop / safe margins"
        help="Check the inset frame for exposed edges before applying camera movement."
        checked={margins}
        onChange={(event) => onMargins(event.target.checked)}
      />
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
  onAdd: (role: Illustration["base"]["role"]) => void;
}

function LayerList(props: LayerListProps) {
  const { image, value, assets, selected, onSelect, onRemove, onAdd } = props;
  return (
    <>
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
      <div className="layer-gallery-actions">
        {illustrationRoles.map((role) => (
          <button
            type="button"
            key={role}
            disabled={value.layers.length >= 11}
            onClick={() => onAdd(role)}
          >
            + {role === "midground" ? "Middleground / character" : role}
          </button>
        ))}
      </div>
    </>
  );
}
