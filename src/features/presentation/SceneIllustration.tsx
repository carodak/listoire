import { useIllustrationPlayback } from "./use-illustration-playback.ts";
import type { BindNode } from "./use-illustration-playback.ts";
import { useAssetSource } from "./use-asset-source.ts";
import { useState, useSyncExternalStore } from "react";
import { Dialog } from "../../shared/Dialog.tsx";
import type { ReactNode } from "react";
import { mediaIsVisible } from "../../contracts/presentation.ts";
import { useTranslation } from "react-i18next";
import type { MediaAsset } from "../../contracts/presentation.ts";
import type { StoryBundle } from "../../contracts/story.ts";
import type { PresentationBlock } from "../../contracts/presentation.ts";
import type { PresentationSession } from "./presentation-session.ts";
import { ReactBitsLayer } from "./react-bits/ReactBitsLayer.tsx";
import "./cinematic.css";
import "./cinematic-shot.css";
import "./illustration-blend.css";
import { IllustrationEditorial } from "./IllustrationEditorial.tsx";
import { LayeredIllustration } from "./LayeredIllustration.tsx";

interface SceneIllustrationProps {
  bundle: StoryBundle;
  passageId: string;
  presentation: PresentationSession;
  block: Extract<PresentationBlock, { kind: "media" }>;
}

export function SceneIllustration({
  bundle,
  passageId,
  presentation,
  block,
}: SceneIllustrationProps) {
  const state = useSyncExternalStore(presentation.subscribe, presentation.getSnapshot);
  const scene = bundle.scenes?.[passageId];
  const illustration = bundle.assets?.find(
    (asset) => asset.id === block.image && ["image", "video"].includes(asset.type),
  );
  const videoSource = useAssetSource(illustration, presentation.resolveAsset);
  const fullscreen =
    block.layout === "fullscreen" &&
    !state.skipMedia &&
    !state.completedBlocks.includes(block.id) &&
    mediaIsVisible(block, state);
  const bindNode = useIllustrationPlayback(
    presentation,
    passageId,
    block.id,
    fullscreen,
    illustration,
    videoSource,
  );
  const content = (
    <IllustrationContent
      {...{ bundle, block, bindNode, state, illustration, videoSource }}
      resolveAsset={presentation.resolveAsset}
    />
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

type IllustrationProps = {
  bundle: StoryBundle;
  block: Extract<PresentationBlock, { kind: "media" }>;
  bindNode: BindNode;
  state: ReturnType<PresentationSession["getSnapshot"]>;
  illustration: MediaAsset | undefined;
  videoSource: string | null;
  resolveAsset: PresentationSession["resolveAsset"];
};
function IllustrationContent({
  bundle,
  block,
  bindNode,
  state,
  illustration,
  videoSource,
  resolveAsset,
}: IllustrationProps) {
  const atmosphere =
    block.motion?.preset === "atmospheric-still" ? "fantasy" : (block.motion?.atmosphere ?? "none");
  const blend = block.illustration?.blend ?? illustration?.scene3d?.blendMode ?? "atmospheric";
  return (
    <div
      ref={(node) => {
        bindNode("canvas", node);
      }}
      tabIndex={-1}
      className={`cinematic-stage scene-illustration illustration-blend atmosphere-${atmosphere}`}
      data-paused={state.paused}
      data-3d={Boolean(illustration?.scene3d)}
      data-layered={Boolean(block.illustration)}
      data-layout={block.layout}
      data-blend={Boolean(
        (block.illustration ? blend !== "none" : illustration?.scene3d?.blend) &&
        block.layout !== "fullscreen",
      )}
      data-blend-mode={blend}
    >
      <IllustrationVisual
        {...{ bundle, block, bindNode, state, illustration, videoSource, resolveAsset }}
      />
      <IllustrationEditorial
        enabled={block.illustration ? blend === "soft" : illustration?.scene3d?.blend}
        mode={blend}
        layout={block.layout}
        edges={illustration?.scene3d?.pageEdges}
      />
      <ShotAtmosphere atmosphere={atmosphere} />
      <EffectLayers bundle={bundle} block={block} state={state} resolveAsset={resolveAsset} />
    </div>
  );
}

export function ShotAtmosphere({ atmosphere }: { atmosphere: string }) {
  if (atmosphere === "none") return null;
  return (
    <div aria-hidden="true" className="shot-atmosphere">
      <i className="shot-grain" />
      <i className="shot-vignette" />
      <i className="shot-dust" />
      <i className="shot-light" />
      <i className="shot-scratches" />
    </div>
  );
}

function IllustrationVisual({
  bundle,
  block,
  bindNode,
  state,
  illustration,
  videoSource,
  resolveAsset,
}: IllustrationProps) {
  return (
    <>
      {block.illustration && (
        <LayeredIllustration
          image={block.image}
          illustration={block.illustration}
          assets={bundle.assets ?? []}
          resolveAsset={resolveAsset}
          moving={Boolean(block.motion && block.motion.preset !== "none")}
          motion={block.motion}
          cameraRef={(node) => bindNode("image", node)}
        />
      )}
      {!block.illustration && illustration?.type === "image" && (
        <img
          ref={(node) => {
            bindNode("image", node);
          }}
          className={imageClass(
            illustration,
            block.layout === "right" ? "shot-image story-cover" : "shot-image",
          )}
          src={videoSource || undefined}
          width={illustration.dimensions?.width}
          height={illustration.dimensions?.height}
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
      {!block.illustration && (
        <DepthLayers
          bundle={bundle}
          block={block}
          bindNode={bindNode}
          resolveAsset={resolveAsset}
        />
      )}
    </>
  );
}

interface CinematicDialogProps {
  presentation: PresentationSession;
  paused: boolean;
  title?: string;
  caption?: string;
  children: ReactNode;
}

function CinematicDialog({ presentation, paused, title, caption, children }: CinematicDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog className="cinematic-dialog" aria-label={title} onDismiss={presentation.skipCinematic}>
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
    </Dialog>
  );
}

interface VideoSurfaceProps {
  illustration: MediaAsset;
  block: Extract<PresentationBlock, { kind: "media" }>;
  bindNode: BindNode;
  state: ReturnType<PresentationSession["getSnapshot"]>;
  source: string | null;
}

function VideoSurface({ illustration, block, bindNode, state, source }: VideoSurfaceProps) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  return (
    <>
      {source ? (
        <video
          ref={(node) => bindNode("video", node)}
          className="shot-image"
          src={source}
          aria-label={illustration.alt || t("video.label")}
          controls={
            !illustration.scene3d &&
            (block.layout !== "fullscreen" ||
              state.skipMedia ||
              state.completedBlocks.includes(block.id))
          }
          loop={Boolean(illustration.scene3d && illustration.scene3d.cinematic.preset === "none")}
          playsInline
          muted
          preload="metadata"
          onLoadStart={() => setFailed(false)}
          onError={() => setFailed(true)}
          style={{ objectFit: block.fit ?? (block.layout === "fullscreen" ? "cover" : "contain") }}
        />
      ) : (
        <p role="status">{t(source === null ? "video.unavailable" : "video.loading")}</p>
      )}
      {failed && <p role="status">{t("video.undecodable")}</p>}
    </>
  );
}

function DepthLayers({
  bundle,
  block,
  bindNode,
  resolveAsset,
}: Pick<IllustrationProps, "bundle" | "block" | "bindNode" | "resolveAsset">) {
  return (
    <>
      {block.motion?.layers.map((id, index) => {
        const asset = bundle.assets?.find((asset) => asset.id === id && asset.type === "image");
        return asset ? (
          <DepthLayer
            key={id}
            asset={asset}
            fit={block.fit ?? "cover"}
            resolveAsset={resolveAsset}
            bind={(node) => bindNode("layer", node, index)}
          />
        ) : null;
      })}
    </>
  );
}
function DepthLayer({
  asset,
  fit,
  resolveAsset,
  bind,
}: {
  asset: MediaAsset;
  fit: NonNullable<IllustrationProps["block"]["fit"]>;
  resolveAsset: PresentationSession["resolveAsset"];
  bind: (node: HTMLImageElement | null) => void;
}) {
  const source = useAssetSource(asset, resolveAsset);
  return (
    <img
      className={imageClass(asset, "parallax-layer")}
      ref={(node) => {
        bind(node);
      }}
      alt=""
      aria-hidden="true"
      src={source || undefined}
      style={{ objectFit: fit }}
    />
  );
}

const imageClass = (asset: MediaAsset, base: string) =>
  asset.id.startsWith("heritage.") ? `${base} archival-ink` : base;
function EffectLayers({
  bundle,
  block,
  state,
  resolveAsset,
}: Pick<IllustrationProps, "bundle" | "block" | "state" | "resolveAsset">) {
  return (
    <>
      {state.layers
        .filter((layer) => layer.blockId === block.id)
        .map((layer) => (
          <EffectLayer
            key={layer.id}
            effect={layer.effect}
            image={bundle.assets?.find(
              (asset) => asset.id === layer.effect.image && asset.type === "image",
            )}
            resolveAsset={resolveAsset}
          />
        ))}
    </>
  );
}
function EffectLayer({
  effect,
  image,
  resolveAsset,
}: {
  effect: IllustrationProps["state"]["layers"][number]["effect"];
  image: MediaAsset | undefined;
  resolveAsset: PresentationSession["resolveAsset"];
}) {
  const source = useAssetSource(image, resolveAsset);
  return <ReactBitsLayer effect={effect} imageUrl={source || undefined} />;
}
