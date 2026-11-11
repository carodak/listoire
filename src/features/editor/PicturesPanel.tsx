import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { useTranslation } from "react-i18next";
import type { MediaAsset } from "../../contracts/presentation.ts";
import { VisualPreview } from "./MediaLibrary.tsx";
import { CloseButton } from "../../shared/CloseButton.tsx";
import { ToolbarGlyph } from "../../shared/ToolbarGlyph.tsx";
import type { Drop, Picture } from "./image-pictures.ts";

type Role = Picture["role"];
const depths: Role[] = ["foreground", "midground", "background"];
const dragged = (event: DragEvent) => {
  const value = event.dataTransfer.getData("text/x-picture");
  return value === "" ? undefined : Number(value);
};
/** The lower half of a row means "behind it" (the list goes front to back). */
const lowerHalf = (event: DragEvent<HTMLElement>) => {
  const box = event.currentTarget.getBoundingClientRect();
  return event.clientY > box.top + box.height / 2;
};

/**
 * The image's layers, as image editors show them: one row per picture, front to back, each with
 * an eye (this preview only), its thumbnail, name and depth, and a ×. Drag a row (or Alt+↑/↓) to
 * reorder it or move it to another depth. The first image is chosen in the preview's start area.
 */
export function PicturesPanel({
  pictures,
  assets,
  selected,
  hidden,
  title,
  onSelect,
  onToggle,
  onAddLayer,
  onMove,
  onRemove,
}: {
  pictures: Picture[];
  assets: MediaAsset[];
  selected: number;
  /** Pictures hidden in the preview (not stored). */
  hidden: number[];
  title: (id: string) => string;
  onSelect: (index: number) => void;
  onToggle: (index: number) => void;
  onAddLayer: () => void;
  onMove: (index: number, role: Role, target?: Drop) => void;
  onRemove: (index: number) => void;
}) {
  const { t } = useTranslation();
  const [drop, setDrop] = useState<Drop | null>(null);
  const panel = useRef<HTMLElement>(null);
  const layered = pictures.length > 1;
  // Front to back: by depth, then the picture drawn last (in front) first.
  const ordered = depths.flatMap((role) =>
    pictures.filter((picture) => picture.role === role).reverse(),
  );
  const step = (picture: Picture, direction: 1 | -1) => {
    if (picture.index < 0) {
      const role = depths[depths.indexOf(picture.role) + direction];
      if (role) onMove(-1, role);
      return;
    }
    const at = ordered.indexOf(picture);
    let next = ordered[at + direction];
    // Nothing goes behind the main picture: past it is the front of the next depth.
    if (direction > 0 && next?.index === -1 && next.role === picture.role) {
      next = ordered[at + 2];
      if (next) onMove(picture.index, next.role, { index: next.index, behind: false });
      return;
    }
    if (next) onMove(picture.index, next.role, { index: next.index, behind: direction > 0 });
  };
  const row = (picture: Picture) => {
    const asset = assets.find((item) => item.id === picture.image);
    const name = title(picture.image);
    const off = hidden.includes(picture.index);
    return (
      <div
        key={picture.index}
        className="image-layer"
        data-hidden={off}
        data-drop={drop?.index === picture.index ? (drop.behind ? "behind" : "front") : undefined}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDrop({ index: picture.index, behind: lowerHalf(event) });
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDrop(null);
          const from = dragged(event);
          if (from !== undefined)
            onMove(from, picture.role, { index: picture.index, behind: lowerHalf(event) });
        }}
      >
        <button
          type="button"
          className="image-eye"
          aria-label={t("editor.image.showNamed", { name })}
          aria-pressed={!off}
          title={t("editor.image.eyeHint")}
          onClick={() => onToggle(picture.index)}
        >
          <ToolbarGlyph name={off ? "eyeOff" : "eye"} width={16} height={16} />
        </button>
        <button
          type="button"
          className="image-picture"
          draggable={layered}
          aria-label={t("editor.image.selectNamed", { name })}
          aria-pressed={selected === picture.index}
          title={layered ? t("editor.image.layerHint") : undefined}
          onClick={() => onSelect(picture.index)}
          onDragStart={(event) =>
            event.dataTransfer.setData("text/x-picture", String(picture.index))
          }
          onDragEnd={() => setDrop(null)}
          onKeyDown={(event) => {
            if (event.key === "Delete" || event.key === "Backspace") {
              event.preventDefault();
              onRemove(picture.index);
            } else if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
              event.preventDefault();
              step(picture, event.key === "ArrowUp" ? -1 : 1);
              // The moved row is re-drawn (selected): keep the keyboard on it.
              requestAnimationFrame(() =>
                panel.current
                  ?.querySelector<HTMLElement>(".image-picture[aria-pressed=true]")
                  ?.focus(),
              );
            }
          }}
        >
          {asset ? <VisualPreview asset={asset} /> : <span className="image-placeholder" />}
          <span className="image-layer-name">
            {name}
            {layered && <small>{t(`editor.image.depth.${picture.role}`)}</small>}
          </span>
        </button>
        <CloseButton
          className="image-remove"
          label={t("editor.image.removeNamed", { name })}
          title={t("editor.image.removeHint")}
          onClick={() => onRemove(picture.index)}
        />
      </div>
    );
  };
  return (
    <section
      ref={panel}
      className="image-pictures"
      aria-label={t(layered ? "editor.image.layers" : "editor.image.single")}
    >
      <h3>{t(layered ? "editor.image.layers" : "editor.image.single")}</h3>
      {!pictures[0]?.image ? (
        <p className="image-none">{t("editor.image.noImage")}</p>
      ) : layered ? (
        depths.map((role) => (
          <div
            key={role}
            className="image-depth"
            role="group"
            aria-label={t(`editor.image.depth.${role}`)}
            // Dropped on the depth itself (not on a row): the front of this depth.
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              setDrop(null);
              const from = dragged(event);
              if (from !== undefined) onMove(from, role);
            }}
          >
            <span className="image-depth-name">{t(`editor.image.depth.${role}`)}</span>
            {ordered.filter((picture) => picture.role === role).map(row)}
          </div>
        ))
      ) : (
        row(pictures[0]!)
      )}
      <button
        type="button"
        className="image-add"
        title={t("editor.image.addLayerHint")}
        disabled={!pictures[0]?.image || pictures.length >= 12}
        onClick={onAddLayer}
      >
        {t("editor.image.addLayer")}
      </button>
    </section>
  );
}
