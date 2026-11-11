import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Illustration } from "../../contracts/illustration.ts";
import type { StoryProject } from "../../contracts/editor-project.ts";
import type { Cinematic } from "../../contracts/cinematic.ts";
import { CompositionPreview } from "./IllustrationPreview.tsx";

type Placement = Illustration["base"];
interface StageProps {
  image: string;
  value: Illustration;
  assets: NonNullable<StoryProject["languages"][string]["configuration"]["assets"]>;
  paper?: string;
  motion: Cinematic;
  layout: string;
  layer: Placement;
  /** The selected picture (-1: the main one), which the handles frame. */
  selected: number;
  /** Pictures hidden in this preview only (the layers panel's eyes). */
  hidden: number[];
  onLayerChange: (change: Partial<Placement>) => void;
  /** Delete (or Backspace) in the preview removes the selected picture. */
  onRemove: () => void;
}
const clamp = (value: number) => Math.max(-75, Math.min(75, value));
const steps: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** The part of an image element where its picture is drawn (object-fit "contain" letterboxes). */
export function drawnBox(image: HTMLImageElement) {
  const box = image.getBoundingClientRect();
  if (getComputedStyle(image).objectFit !== "contain" || !image.naturalWidth) return box;
  const ratio = image.naturalWidth / image.naturalHeight;
  const width = Math.min(box.width, box.height * ratio);
  const height = width / ratio;
  return new DOMRect(
    box.x + (box.width - width) / 2,
    box.y + (box.height - height) / 2,
    width,
    height,
  );
}

type Box = { left: number; top: number; width: number; height: number };
const sameBox = (a?: Box, b?: Box) =>
  a === b ||
  (!!a &&
    !!b &&
    (["left", "top", "width", "height"] as const).every((k) => Math.abs(a[k] - b[k]) < 0.5));

/**
 * Watches the preview each frame (sizes change as images load and the camera moves): whether a
 * picture goes past the frame, and where the selected one is drawn, relative to the stage.
 */
function useStageGeometry(selected: number) {
  const stage = useRef<HTMLElement>(null);
  const [geometry, setGeometry] = useState<{ overflow: boolean; box?: Box }>({ overflow: false });
  useEffect(() => {
    let frame = 0;
    const check = () => {
      const root = stage.current;
      const view = root?.querySelector(".multiplane-viewport");
      const bounds = view?.getBoundingClientRect();
      const overflow =
        !!bounds &&
        [...view!.querySelectorAll<HTMLImageElement>(".multiplane-plane img")].some((image) => {
          if (getComputedStyle(image).visibility === "hidden") return false;
          const box = drawnBox(image);
          return (
            box.left < bounds.left - 1 ||
            box.top < bounds.top - 1 ||
            box.right > bounds.right + 1 ||
            box.bottom > bounds.bottom + 1
          );
        });
      const image =
        root?.querySelector<HTMLImageElement>(
          `.multiplane-plane[data-layer="${selected + 1}"] img`,
        ) ?? (selected < 0 ? root?.querySelector<HTMLImageElement>(".isolated-image") : null);
      const origin = root?.getBoundingClientRect();
      const drawn = image && origin && drawnBox(image);
      const box = drawn
        ? {
            left: drawn.left - origin.left,
            top: drawn.top - origin.top,
            width: drawn.width,
            height: drawn.height,
          }
        : undefined;
      setGeometry((before) =>
        before.overflow === overflow && sameBox(before.box, box) ? before : { overflow, box },
      );
      frame = requestAnimationFrame(check);
    };
    check();
    return () => cancelAnimationFrame(frame);
  }, [selected]);
  return { stage, ...geometry };
}

const corners = ["nw", "ne", "sw", "se"] as const;
/** Corner handles on the selected picture: dragging one scales it from its centre. */
function ResizeHandles({
  box,
  scale,
  onScale,
}: {
  box: Box;
  scale: number;
  onScale: (scale: number) => void;
}) {
  const { t } = useTranslation();
  const [drag, setDrag] = useState<{
    x: number;
    y: number;
    distance: number;
    scale: number;
  } | null>(null);
  const centre = (event: PointerEvent<HTMLElement>) => {
    const stage = event.currentTarget.closest(".image-stage")!.getBoundingClientRect();
    return { x: stage.left + box.left + box.width / 2, y: stage.top + box.top + box.height / 2 };
  };
  return (
    <div
      className="image-handles"
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
    >
      {corners.map((corner) => (
        <span
          key={corner}
          className="image-handle"
          data-corner={corner}
          title={t("editor.image.resizeHint")}
          onPointerDown={(event) => {
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
            const { x, y } = centre(event);
            const distance = Math.hypot(event.clientX - x, event.clientY - y);
            setDrag({ x, y, distance, scale });
          }}
          onPointerMove={(event) => {
            if (!drag || !drag.distance) return;
            const distance = Math.hypot(event.clientX - drag.x, event.clientY - drag.y);
            // The Size slider's steps (0.05), so both show the same value.
            const next = Math.round(drag.scale * (distance / drag.distance) * 20) / 20;
            onScale(Math.max(0.2, Math.min(3, next)));
          }}
          onPointerUp={() => setDrag(null)}
          onPointerCancel={() => setDrag(null)}
        />
      ))}
    </div>
  );
}

/** The live preview: drag (or the arrow keys) moves the selected picture. */
export function ImageStage({
  layer,
  selected,
  hidden,
  onLayerChange,
  onRemove,
  ...preview
}: StageProps) {
  const { t } = useTranslation();
  const [margins, showMargins] = useState(false);
  const { stage, overflow, box } = useStageGeometry(selected);
  return (
    <section
      className="image-stage"
      ref={stage}
      data-overflow={overflow}
      aria-label={t("editor.image.preview")}
    >
      <ImageDragStage layer={layer} onChange={onLayerChange} onRemove={onRemove}>
        <CompositionPreview {...preview} margins={margins} />
      </ImageDragStage>
      {hidden.length > 0 && (
        <style>
          {hidden
            .map(
              (index) =>
                `.image-stage .multiplane-plane[data-layer="${index + 1}"]${index < 0 ? ", .image-stage .isolated-illustration" : ""}{visibility:hidden}`,
            )
            .join("")}
        </style>
      )}
      {box && !hidden.includes(selected) && (
        <ResizeHandles
          box={box}
          scale={layer.scale}
          onScale={(scale) => onLayerChange({ scale })}
        />
      )}
      <button
        type="button"
        className="image-safe-frame"
        aria-pressed={margins}
        title={t("editor.image.safeFrameHint")}
        onClick={() => showMargins(!margins)}
      >
        {t("editor.image.safeFrame")}
      </button>
    </section>
  );
}

function ImageDragStage({
  layer,
  onChange,
  onRemove,
  children,
}: {
  layer: Placement;
  onChange: (change: Partial<Placement>) => void;
  onRemove: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const [drag, setDrag] = useState<{ x: number; y: number; origin: Placement } | null>(null);
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const rect = event.currentTarget.getBoundingClientRect();
    onChange({
      x: clamp(drag.origin.x + ((event.clientX - drag.x) / rect.width) * 100),
      y: clamp(drag.origin.y + ((event.clientY - drag.y) / rect.height) * 100),
    });
  };
  const nudge = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      onRemove();
      return;
    }
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    onChange({ x: clamp(layer.x + step[0]), y: clamp(layer.y + step[1]) });
  };
  return (
    <div
      className="illustration-drag-stage"
      tabIndex={0}
      title={t("editor.image.dragHint")}
      aria-label={t("editor.image.dragHint")}
      onKeyDown={nudge}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest("button")) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDrag({ x: event.clientX, y: event.clientY, origin: { ...layer } });
      }}
      onPointerMove={move}
      onPointerUp={() => setDrag(null)}
      onPointerCancel={() => setDrag(null)}
    >
      {children}
    </div>
  );
}
