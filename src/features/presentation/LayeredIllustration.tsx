import type { CSSProperties } from "react";
import type { Cinematic } from "../../contracts/cinematic.ts";
import type { Illustration } from "../../contracts/illustration.ts";
import type { MediaAsset } from "../../contracts/presentation.ts";
import { useSmartCrop } from "./smart-crop.ts";
import { useAssetSource } from "./use-asset-source.ts";
import type { PresentationSession } from "./presentation-session.ts";
import "./layered-illustration.css";

interface LayeredIllustrationProps {
  image: string;
  illustration: Illustration;
  assets: MediaAsset[];
  resolveAsset: PresentationSession["resolveAsset"];
  cameraRef?: (node: HTMLDivElement | null) => void;
  moving?: boolean;
  motion?: Cinematic;
}

const PULLBACK_PRESETS = new Set<string>([
  "dolly-pullback",
  "deep-pullback",
  "low-diagonal-pullback",
  "high-arrival-hold-pullback",
]);

/** A single untransformed image can render without the multiplane camera rig. */
function isFlat({ base, layers }: Illustration) {
  return (
    !layers.length &&
    base.role !== "background" &&
    base.x === 0 &&
    base.y === 0 &&
    base.scale === 1 &&
    !base.rotation
  );
}

export function LayeredIllustration({
  image,
  illustration,
  assets,
  resolveAsset,
  cameraRef,
  moving = false,
  motion,
}: LayeredIllustrationProps) {
  const asset =
    !moving && isFlat(illustration) ? assets.find((asset) => asset.id === image) : undefined;
  if (asset)
    return (
      <SolitaryImage
        asset={asset}
        autoCrop={illustration.autoCrop ?? false}
        resolveAsset={resolveAsset}
        cameraRef={cameraRef}
      />
    );
  return (
    <div
      className="multiplane-viewport"
      data-aspect={illustration.aspect}
      data-moving={moving}
      data-solitary={!illustration.layers.length}
      style={
        {
          "--camera-overscan": motion && PULLBACK_PRESETS.has(motion.preset) ? 2 : 1.3,
        } as CSSProperties
      }
    >
      <div className="multiplane-camera" ref={cameraRef}>
        {[{ image, ...illustration.base }, ...illustration.layers].map((layer, index) => {
          const asset = assets.find((asset) => asset.id === layer.image);
          return (
            asset && (
              <ImagePlane
                key={`${index}:${layer.image}`}
                asset={asset}
                layer={layer}
                autoCrop={illustration.autoCrop ?? false}
                solitary={!illustration.layers.length}
                resolveAsset={resolveAsset}
              />
            )
          );
        })}
      </div>
    </div>
  );
}

function SolitaryImage({
  asset,
  autoCrop,
  resolveAsset,
  cameraRef,
}: Pick<ImagePlaneProps, "asset" | "autoCrop" | "resolveAsset"> &
  Pick<LayeredIllustrationProps, "cameraRef">) {
  const original = useAssetSource(asset, resolveAsset);
  const source = useSmartCrop(original || undefined, autoCrop);
  return (
    <div className="isolated-illustration" ref={cameraRef}>
      <img
        className="shot-plane-image isolated-image"
        src={source || undefined}
        alt={asset.alt}
        draggable={false}
      />
    </div>
  );
}

interface ImagePlaneProps {
  asset: MediaAsset;
  autoCrop: boolean;
  solitary: boolean;
  layer: Illustration["layers"][number];
  resolveAsset: PresentationSession["resolveAsset"];
}

function ImagePlane({ asset, autoCrop, solitary, layer, resolveAsset }: ImagePlaneProps) {
  const original = useAssetSource(asset, resolveAsset);
  const source = useSmartCrop(original || undefined, autoCrop);
  const weight = solitary ? 1 : { foreground: 1, midground: 0.5, background: 0.15 }[layer.role];
  const style = { zIndex: { background: 0, midground: 1, foreground: 2 }[layer.role] };
  return (
    <div
      className="multiplane-plane"
      data-role={layer.role}
      data-image={asset.id}
      data-distance={800 / weight}
      style={style}
    >
      <img
        className="shot-plane-image"
        src={source || undefined}
        alt={asset.alt}
        draggable={false}
        style={
          {
            "--layer-x": `${layer.x}%`,
            "--layer-y": `${layer.y}%`,
            "--layer-scale": layer.scale,
            "--layer-rotation": `${layer.rotation ?? 0}deg`,
          } as CSSProperties
        }
      />
    </div>
  );
}
