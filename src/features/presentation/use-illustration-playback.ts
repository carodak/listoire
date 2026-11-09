import { useLayoutEffect, useRef } from "react";
import type { MediaAsset } from "../../contracts/presentation.ts";
import type { PresentationSession } from "./presentation-session.ts";

export function useIllustrationPlayback(
  presentation: PresentationSession,
  passageId: string,
  blockId: string,
  fullscreen: boolean,
  illustration: MediaAsset | undefined,
  videoSource: string | null,
) {
  const nodes = useRef<SurfaceNodes>({
    image: null,
    video: null,
    layers: [],
    canvas: null,
    wasFullscreen: false,
  });
  useLayoutEffect(() => {
    if (!fullscreen && nodes.current.wasFullscreen)
      nodes.current.canvas?.focus({ preventScroll: true });
    nodes.current.wasFullscreen = fullscreen;
    if (illustration && !videoSource) return;
    return presentation.bind(
      {
        canvas: nodes.current.canvas!,
        image: nodes.current.image!,
        layers: nodes.current.layers.filter((layer): layer is HTMLImageElement => Boolean(layer)),
        video: nodes.current.video ?? undefined,
        silentVideo: Boolean(illustration?.scene3d),
      },
      blockId,
    );
  }, [presentation, passageId, blockId, fullscreen, videoSource, illustration]);
  const bindNode: BindNode = (kind, node, index = 0) => {
    if (kind === "layer") nodes.current.layers[index] = node as HTMLImageElement | null;
    else if (kind === "canvas") nodes.current.canvas = node as HTMLDivElement | null;
    else {
      nodes.current.image = node;
      if (kind === "video") nodes.current.video = node as HTMLVideoElement | null;
    }
  };
  return bindNode;
}

export type BindNode = (
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
