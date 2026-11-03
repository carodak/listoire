import type { z } from "zod";
import type { SceneSchema, PresentationBlock } from "./presentation.ts";
import type { NarrativeEvent } from "./effects.ts";

type Issue = (message: string) => void;
type Assets = Map<string, { type: "image" | "audio" | "video" }>;
type MediaBlock = Extract<PresentationBlock, { kind: "media" }>;

function validateOrder(blocks: PresentationBlock[], segments: string[], invalid: Issue) {
  const textIds = blocks.filter((block) => block.kind === "text").map((block) => block.segmentId);
  if (JSON.stringify(textIds) !== JSON.stringify(segments))
    invalid("Blocks must preserve every declared Ink segment in order");
  if (
    blocks.at(-1)?.kind !== "choices" ||
    blocks.filter((block) => block.kind === "choices").length !== 1
  )
    invalid("Choices must be the final block");
  const media = blocks.filter((block) => block.kind === "media");
  if (new Set(media.map((block) => block.id)).size !== media.length)
    invalid("Duplicate media block ID");
  return media;
}

function validateColors(event: NarrativeEvent, palette: string[], invalid: Issue) {
  if (event.action.kind !== "effect") return;
  const effect = event.action.effect;
  const props = "props" in effect ? effect.props : effect;
  const colors = Object.entries(props)
    .filter(([key]) => key.toLowerCase().includes("color"))
    .flatMap(([, value]) => (Array.isArray(value) ? value : [value]));
  const normalize = (color: string) =>
    color.length === 4
      ? "#" +
        color
          .slice(1)
          .split("")
          .map((letter) => letter + letter)
          .join("")
      : color.toLowerCase();
  for (const color of colors)
    if (typeof color === "string" && !palette.map(normalize).includes(normalize(color)))
      invalid("Effect color is outside the story palette");
  const imageEffects = [
    "react-bits.noise",
    "react-bits.ripple-distortion",
    "react-bits.grid-distortion",
  ];
  if (effect.id.startsWith("react-bits.") && !imageEffects.includes(effect.id) && !colors.length)
    invalid("Colored effects need an explicit story palette");
}

function validateCues(
  events: NarrativeEvent[],
  media: MediaBlock[],
  segments: string[],
  assets: Assets,
  invalid: Issue,
) {
  const ids = new Set(media.map((block) => block.id));
  if (new Set(events.map((event) => event.id)).size !== events.length)
    invalid("Duplicate event ID");
  for (const event of events) {
    validateExit(event, invalid);
    if (
      event.blockId &&
      !ids.has(event.blockId) &&
      event.blockId !== "page" &&
      !segments.includes(event.blockId)
    )
      invalid("Unknown event target block");
    if (event.trigger.kind === "block" && !ids.has(event.trigger.blockId!))
      invalid("Unknown block trigger");
    if (event.trigger.kind === "segment" && !segments.includes(event.trigger.segmentId!))
      invalid("Unknown segment trigger");
    if (event.action.kind === "audio" && assets.get(event.action.assetId)?.type !== "audio")
      invalid("Unknown audio cue");
  }
}
function validateExit(event: NarrativeEvent, invalid: Issue) {
  if (event.phase !== "exit") return;
  if (
    event.blockId !== "page" ||
    event.trigger.kind !== "passage" ||
    event.action.kind !== "effect" ||
    event.action.effect.id !== "fade-out"
  )
    invalid("Scene transitions require a page fade-out on passage exit");
}

export function validateScenePresentation(
  scene: z.infer<typeof SceneSchema>,
  segments: string[],
  assets: Assets,
  palette: string[] | undefined,
  invalid: Issue,
) {
  const media = scene.blocks ? validateOrder(scene.blocks, segments, invalid) : [];
  const events = scene.events ?? [];
  validateCues(events, media, segments, assets, invalid);
  for (const block of media) validateMediaBlock(block, events, segments, assets, invalid);
  if (palette) for (const event of events) validateColors(event, palette, invalid);
}
function validateMediaBlock(
  block: MediaBlock,
  events: NarrativeEvent[],
  segments: string[],
  assets: Assets,
  invalid: Issue,
) {
  if (!["image", "video"].includes(assets.get(block.image)?.type ?? ""))
    invalid("Unknown block media");
  for (const id of block.motion?.layers ?? [])
    if (assets.get(id)?.type !== "image") invalid("Parallax layers must reference library images");
  if (block.show?.kind === "segment" && !segments.includes(block.show.segmentId!))
    invalid("Unknown image timing segment");
  if (
    block.layout === "fullscreen" &&
    !events.some((event) => event.blockId === block.id && event.blocking)
  )
    invalid("Fullscreen media needs a bounded blocking event");
}
