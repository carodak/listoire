import { useEffect, useState, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { mediaIsVisible } from "../../contracts/presentation.ts";
import { useTranslation } from "react-i18next";
import type { MediaAsset } from "../../contracts/uploaded-media.ts";
import type { StoryBundle } from "../../contracts/story.ts";
import type { PresentationBlock } from "../../contracts/presentation.ts";
import type { PresentationSession } from "./presentation-session.ts";
import { ReactBitsLayer } from "./react-bits/ReactBitsLayer.tsx";
import "./cinematic.css";
import "./cinematic-shot.css";

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
  const nodes = useRef<SurfaceNodes>({
    image: null,
    video: null,
    layers: [],
    canvas: null,
    wasFullscreen: false,
  });
  const state = useSyncExternalStore(presentation.subscribe, presentation.getSnapshot);
  const scene = bundle.scenes?.[passageId];
  const illustration = bundle.assets?.find(
    (asset) => asset.id === block.image && ["image", "video"].includes(asset.type),
  );
  const videoSource = useVideoSource(illustration, presentation);
  const fullscreen =
    block.layout === "fullscreen" &&
    !state.revealAll &&
    !state.completedBlocks.includes(block.id) &&
    mediaIsVisible(block, state);
  useLayoutEffect(() => {
    if (!fullscreen && nodes.current.wasFullscreen)
      nodes.current.canvas?.focus({ preventScroll: true });
    nodes.current.wasFullscreen = fullscreen;
    if (illustration?.type === "video" && !videoSource) return;
    return presentation.bind(
      {
        canvas: nodes.current.canvas!,
        image: nodes.current.image!,
        layers: nodes.current.layers.filter((layer): layer is HTMLImageElement => Boolean(layer)),
        video: nodes.current.video ?? undefined,
      },
      block.id,
    );
  }, [presentation, passageId, block.id, fullscreen, videoSource, illustration?.type]);
  const bindNode: BindNode = (kind, node, index = 0) => {
    if (kind === "layer") nodes.current.layers[index] = node as HTMLImageElement | null;
    else if (kind === "canvas") nodes.current.canvas = node as HTMLDivElement | null;
    else {
      nodes.current.image = node;
      if (kind === "video") nodes.current.video = node as HTMLVideoElement | null;
    }
  };
  const content = (
    <IllustrationContent {...{ bundle, block, bindNode, state, illustration, videoSource }} />
  );
  if (fullscreen)
    return (
      <CinematicDialog
        presentation={presentation}
        paused={state.paused}
        title={block.caption ?? scene?.title}
        caption={block.caption}
      >
        {content}
      </CinematicDialog>
    );
  return content;
}

type BindNode = (
  kind: "image" | "video" | "canvas" | "layer",
  node: HTMLElement | null,
  index?: number,
) => void;
interface SurfaceNodes {
  image: HTMLElement | null;
  video: HTMLVideoElement | null;
  layers: (HTMLImageElement | null)[];
  canvas: HTMLDivElement | null;
  wasFullscreen: boolean;
}
function useVideoSource(illustration: MediaAsset | undefined, presentation: PresentationSession) {
  const [resource, setResource] = useState<{ assetId: string; url: string | null }>({
    assetId: "",
    url: "",
  });
  useEffect(() => {
    if (illustration?.type !== "video") return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    void presentation
      .resolveAsset(illustration)
      .then((resource) => {
        if (cancelled) {
          resource.dispose();
          return;
        }
        dispose = resource.dispose;
        setResource({ assetId: illustration.id, url: resource.url });
      })
      .catch(() => {
        if (!cancelled) setResource({ assetId: illustration.id, url: null });
      });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [illustration, presentation]);
  return resource.assetId === illustration?.id ? resource.url : "";
}
type IllustrationProps = {
  bundle: StoryBundle;
  block: Extract<PresentationBlock, { kind: "media" }>;
  bindNode: BindNode;
  state: ReturnType<PresentationSession["getSnapshot"]>;
  illustration: MediaAsset | undefined;
  videoSource: string | null;
};
function IllustrationContent({
  bundle,
  block,
  bindNode,
  state,
  illustration,
  videoSource,
}: IllustrationProps) {
  const atmosphere = block.motion?.atmosphere ?? "none";
  return (
    <div
      ref={(node) => {
        bindNode("canvas", node);
      }}
      tabIndex={-1}
      className={`cinematic-stage scene-illustration atmosphere-${atmosphere}`}
      data-paused={state.paused}
    >
      {illustration?.type === "image" && (
        <img
          ref={(node) => {
            bindNode("image", node);
          }}
          className={imageClass(
            illustration,
            block.layout === "right" ? "shot-image story-cover" : "shot-image",
          )}
          src={`${import.meta.env.BASE_URL}stories/${bundle.storyId}/${illustration.path}`}
          alt={illustration.alt}
          style={{ objectFit: block.fit ?? (block.layout === "fullscreen" ? "cover" : "contain") }}
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      )}
      {illustration?.type === "video" && (
        <VideoSurface
          illustration={illustration}
          block={block}
          bindNode={bindNode}
          state={state}
          source={videoSource}
        />
      )}
      <DepthLayers bundle={bundle} block={block} bindNode={bindNode} />
      {atmosphere !== "none" && (
        <div aria-hidden="true" className="shot-atmosphere">
          <i className="shot-grain" />
          <i className="shot-vignette" />
          <i className="shot-dust" />
          <i className="shot-light" />
          <i className="shot-scratches" />
        </div>
      )}
      <EffectLayers bundle={bundle} block={block} state={state} />
    </div>
  );
}

function CinematicDialog({
  presentation,
  paused,
  title,
  caption,
  children,
}: {
  presentation: PresentationSession;
  paused: boolean;
  title?: string;
  caption?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="cinematic-dialog"
      aria-label={title}
      onCancel={presentation.skipCinematic}
      onClose={presentation.skipCinematic}
    >
      <button
        className="cinematic-transport"
        onClick={paused ? presentation.resume : presentation.pause}
      >
        {t(paused ? "resume" : "pause")}
      </button>
      <button
        className="cinematic-skip"
        onClick={presentation.skipCinematic}
        aria-label={t("skipCinematic")}
      >
        {t("skipCinematic")} <span aria-hidden="true">↗</span>
      </button>
      {children}
      {caption && <p className="cinematic-caption">{caption}</p>}
    </dialog>
  );
}

function VideoSurface({
  illustration,
  block,
  bindNode,
  state,
  source,
}: {
  illustration: MediaAsset;
  block: Extract<PresentationBlock, { kind: "media" }>;
  bindNode: BindNode;
  state: ReturnType<PresentationSession["getSnapshot"]>;
  source: string | null;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <>
      {source ? (
        <video
          ref={(node) => bindNode("video", node)}
          className="shot-image"
          src={source}
          aria-label={illustration.alt || "Story video"}
          controls={
            block.layout !== "fullscreen" ||
            state.revealAll ||
            state.completedBlocks.includes(block.id)
          }
          playsInline
          muted
          preload="metadata"
          onLoadStart={() => setFailed(false)}
          onError={() => setFailed(true)}
          style={{ objectFit: block.fit ?? (block.layout === "fullscreen" ? "cover" : "contain") }}
        />
      ) : (
        <p role="status">
          {source === null
            ? "Video unavailable. Restore its project backup if the local file is missing."
            : "Loading video…"}
        </p>
      )}
      {failed && (
        <p role="status">
          This browser cannot decode this video. Its file is preserved; use a compatible MP4/WebM
          codec or another browser to play it.
        </p>
      )}
    </>
  );
}

function DepthLayers({
  bundle,
  block,
  bindNode,
}: Pick<IllustrationProps, "bundle" | "block" | "bindNode">) {
  return (
    <>
      {block.motion?.layers.map((id, index) => {
        const asset = bundle.assets?.find((asset) => asset.id === id && asset.type === "image");
        return asset ? (
          <img
            className={imageClass(asset, "parallax-layer")}
            key={id}
            ref={(node) => {
              bindNode("layer", node, index);
            }}
            alt=""
            aria-hidden="true"
            src={`${import.meta.env.BASE_URL}stories/${bundle.storyId}/${asset.path}`}
            style={{ objectFit: block.fit ?? "cover" }}
          />
        ) : null;
      })}
    </>
  );
}

const imageClass = (asset: MediaAsset, base: string) =>
  asset.id.startsWith("heritage.") ? `${base} archival-ink` : base;
function EffectLayers({
  bundle,
  block,
  state,
}: Pick<IllustrationProps, "bundle" | "block" | "state">) {
  return (
    <>
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
    </>
  );
}
