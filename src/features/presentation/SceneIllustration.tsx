import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import type { StoryBundle } from "../../contracts/story.ts";
import type { PresentationSession } from "./presentation-session.ts";
import { ReactBitsLayer } from "./react-bits/ReactBitsLayer.tsx";
import "./cinematic.css";

export function SceneIllustration({
  bundle,
  passageId,
  presentation,
}: {
  bundle: StoryBundle;
  passageId: string;
  presentation: PresentationSession;
}) {
  const image = useRef<HTMLImageElement>(null);
  const previous = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const state = useSyncExternalStore(presentation.subscribe, presentation.getSnapshot);
  const scene = bundle.scenes?.[passageId];
  const illustration = bundle.assets?.find(
    (asset) => asset.id === scene?.image && asset.type === "image",
  );
  useLayoutEffect(() => {
    if (!canvas.current) return;
    return presentation.bind({
      canvas: canvas.current,
      ...(image.current ? { image: image.current } : {}),
      ...(previous.current ? { previousImage: previous.current } : {}),
    });
  }, [presentation, passageId]);
  return (
    <div
      ref={canvas}
      className={`cinematic-stage scene-illustration${illustration ? "" : " scene-empty"}`}
    >
      {state.previousImage && (
        <img
          ref={previous}
          className="previous-scene-image"
          src={`${import.meta.env.BASE_URL}stories/${bundle.storyId}/${bundle.assets?.find((asset) => asset.id === state.previousImage)?.path}`}
          alt=""
          aria-hidden="true"
        />
      )}
      {illustration && (
        <img
          ref={image}
          src={`${import.meta.env.BASE_URL}stories/${bundle.storyId}/${illustration.path}`}
          alt={illustration.alt}
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      )}
      {state.layers.map((layer) => {
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
}
