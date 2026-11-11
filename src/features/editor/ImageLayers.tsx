import { useState } from "react";
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
  onLayerChange: (change: Partial<Placement>) => void;
}
const clamp = (value: number) => Math.max(-75, Math.min(75, value));
const steps: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** The live preview: drag (or the arrow keys) moves the selected picture. */
export function ImageStage({ layer, onLayerChange, ...preview }: StageProps) {
  const { t } = useTranslation();
  const [margins, showMargins] = useState(false);
  return (
    <section className="image-stage" aria-label={t("editor.image.preview")}>
      <ImageDragStage layer={layer} onChange={onLayerChange}>
        <CompositionPreview {...preview} margins={margins} />
      </ImageDragStage>
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
  children,
}: {
  layer: Placement;
  onChange: (change: Partial<Placement>) => void;
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
    const step = steps[event.key];
    if (!step || event.target !== event.currentTarget) return;
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
