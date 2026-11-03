import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import type { StoryBundle } from "../../contracts/story.ts";
import type { PresentationBlock } from "../../contracts/presentation.ts";
import type { PresentationSession } from "./presentation-session.ts";
import { ReactBitsLayer } from "./react-bits/ReactBitsLayer.tsx";
import "./cinematic.css";

export function SceneIllustration({
  bundle,
  passageId,
  presentation,
  block,
}: {
  bundle: StoryBundle;
  passageId: string;
  presentation: PresentationSession;
  block: Extract<PresentationBlock, { kind: "media" }>;
}) {
  const { t } = useTranslation();
  const image = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const wasFullscreen = useRef(false);
  const state = useSyncExternalStore(presentation.subscribe, presentation.getSnapshot);
  const scene = bundle.scenes?.[passageId];
  const illustration = bundle.assets?.find(
    (asset) => asset.id === block.image && asset.type === "image",
  );
  const fullscreen =
    block.layout === "fullscreen" && !state.revealAll && !state.completedBlocks.includes(block.id);
  const togglePlayback = state.paused
    ? { action: presentation.resume, label: t("resume") }
    : { action: presentation.pause, label: t("pause") };
  useLayoutEffect(() => {
    if (fullscreen) dialog.current?.showModal();
    else if (wasFullscreen.current) canvas.current!.focus({ preventScroll: true });
    wasFullscreen.current = fullscreen;
    return presentation.bind(
      {
        canvas: canvas.current!,
        image: image.current!,
      },
      block.id,
    );
  }, [presentation, passageId, block.id, fullscreen]);
  const content = (
    <div ref={canvas} tabIndex={-1} className="cinematic-stage scene-illustration">
      {illustration && (
        <img
          ref={image}
          src={`${import.meta.env.BASE_URL}stories/${bundle.storyId}/${illustration.path}`}
          alt={illustration.alt}
          style={block.fit ? { objectFit: block.fit } : undefined}
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      )}
      {state.layers
        .filter((layer) => layer.blockId === block.id)
        .map((layer) => {
          const resource = bundle.assets?.find(
            (asset) => asset.id === layer.effect.image && asset.type === "image",
          );
          return (
            <ReactBitsLayer
              key={layer.id}
              effect={layer.effect}
              imageUrl={
                resource
                  ? `${import.meta.env.BASE_URL}stories/${bundle.storyId}/${resource.path}`
                  : undefined
              }
            />
          );
        })}
    </div>
  );
  if (fullscreen)
    return (
      <dialog
        ref={dialog}
        className="cinematic-dialog"
        aria-label={block.caption ?? scene?.title}
        onCancel={() => presentation.skipCinematic()}
        onClose={() => presentation.skipCinematic()}
      >
        <button className="cinematic-transport" onClick={togglePlayback.action}>
          {togglePlayback.label}
        </button>
        <button
          className="cinematic-skip"
          onClick={presentation.skipCinematic}
          aria-label={t("skipCinematic")}
        >
          {t("skipCinematic")} <span aria-hidden="true">↗</span>
        </button>
        {content}
        {block.caption && <p className="cinematic-caption">{block.caption}</p>}
      </dialog>
    );
  return content;
}
