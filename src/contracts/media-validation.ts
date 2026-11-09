import type { PresentationBlock } from "./presentation.ts";
import type { NarrativeEvent } from "./narrative-events.ts";
type Issue = (message: string) => void;
type Assets = Map<string, { type: "image" | "audio" | "video" | "model3d" }>;
type MediaBlock = Extract<PresentationBlock, { kind: "media" }>;

export function validateMediaBlock(
  block: MediaBlock,
  events: NarrativeEvent[],
  segments: string[],
  assets: Assets,
  invalid: Issue,
) {
  validateExamination(block, assets, invalid);
  if (!["image", "video"].includes(assets.get(block.image)?.type ?? ""))
    invalid("Unknown block media");
  for (const id of block.motion?.layers ?? [])
    if (assets.get(id)?.type !== "image") invalid("Parallax layers must reference library images");
  validateIllustration(block, assets, invalid);
  if (block.show?.kind === "segment" && !segments.includes(block.show.segmentId!))
    invalid("Unknown image timing segment");
  if (
    block.layout === "fullscreen" &&
    !events.some((event) => event.blockId === block.id && event.blocking)
  )
    invalid("Fullscreen media needs a bounded blocking event");
}

function validateIllustration(block: MediaBlock, assets: Assets, invalid: Issue) {
  if (block.illustration) {
    const ids = block.illustration.layers.map((layer) => layer.image);
    if (assets.get(block.image)?.type !== "image") invalid("Illustrations need an image base");
    for (const id of ids)
      if (assets.get(id)?.type !== "image")
        invalid("Illustration layers must reference library images");
    if (block.motion?.layers.length)
      invalid("Use illustration layers or legacy depth layers, not both");
    if (block.illustration.wrap !== "none" && block.layout !== "inline")
      invalid("Text wrapping requires an inline illustration");
  }
}

function validateExamination(block: MediaBlock, assets: Assets, invalid: Issue) {
  if (
    block.examination &&
    (block.layout === "fullscreen" ||
      block.examination.image !== block.image ||
      assets.get(block.image)?.type !== "image")
  )
    invalid("Only non-cinematic images can be examined, using their own image");
}
