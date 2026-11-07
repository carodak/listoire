import type { ReactNode, CSSProperties } from "react";
import type { PresentationBlock } from "../../contracts/presentation.ts";
import type { StoryBundle } from "../../contracts/story.ts";
import type { PresentationSession } from "../presentation/presentation-session.ts";
import { useSmartCrop } from "../presentation/use-smart-crop.ts";
import { useAssetSource } from "../presentation/use-asset-source.ts";

type Media = Extract<PresentationBlock, { kind: "media" }>;
interface ReaderMediaFigureProps {
  block: Media;
  bundle: StoryBundle;
  presentation: PresentationSession;
  hidden: boolean;
  examinable: boolean;
  children: ReactNode;
}

export function ReaderMediaFigure({
  block,
  bundle,
  presentation,
  hidden,
  examinable,
  children,
}: ReaderMediaFigureProps) {
  const asset = usesAlphaContour(block)
    ? bundle.assets?.find((asset) => asset.id === block.image)
    : undefined;
  const original = useAssetSource(asset, presentation.resolveAsset);
  const contour = useSmartCrop(original || undefined, block.illustration?.autoCrop ?? false);
  return (
    <figure
      className={`narrative-media media-${block.layout}`}
      data-photograph={Boolean(block.photograph)}
      data-examinable={examinable}
      data-block={block.id}
      data-wrap={block.illustration?.wrap}
      hidden={hidden}
      style={
        {
          translate: block.position ? `${block.position.x}% ${block.position.y}%` : undefined,
          width: block.widthPercent ? `${block.widthPercent}%` : undefined,
          shapeOutside: contour ? `url("${contour}")` : undefined,
          ...mediaAlignment[block.align ?? "left"],
          "--wrapped-width":
            block.widthPercent && block.widthPercent < 100 ? `${block.widthPercent}%` : "46%",
        } as CSSProperties & { "--wrapped-width": string }
      }
    >
      {children}
    </figure>
  );
}
function usesAlphaContour(block: Media) {
  const illustration = block.illustration;
  if (
    !illustration ||
    illustration.wrap === "none" ||
    illustration.layers.length ||
    block.caption ||
    block.examination ||
    block.photograph
  )
    return false;
  return (
    illustration.base.role !== "background" &&
    illustration.base.scale === 1 &&
    illustration.base.x === 0 &&
    illustration.base.y === 0 &&
    (!block.motion || block.motion.preset === "none")
  );
}
const mediaAlignment = {
  left: { marginInlineEnd: "auto" },
  right: { marginInlineStart: "auto" },
  center: { marginInlineStart: "auto", marginInlineEnd: "auto" },
};
