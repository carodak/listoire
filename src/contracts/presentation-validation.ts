import { validateMediaBlock } from "./media-validation.ts";
import { validateEffectColors } from "./effect-colors.ts";
import type { z } from "zod";
import { isMediaBlock } from "./presentation.ts";
import type { SceneSchema } from "./presentation.ts";
import type { NarrativeEvent } from "./narrative-events.ts";

type Issue = (message: string) => void;
type Assets = Map<string, { type: "image" | "audio" | "video" | "model3d" }>;
function validateCues(
  events: NarrativeEvent[],
  ids: Set<string>,
  segments: string[],
  assets: Assets,
  invalid: Issue,
) {
  const targets = new Set(["page", ...segments, ...ids]);
  const triggerTargets = { block: ids, segment: new Set(segments) };
  if (new Set(events.map((event) => event.id)).size !== events.length)
    invalid("Duplicate event ID");
  for (const event of events) {
    if (event.blockId && !targets.has(event.blockId)) invalid("Unknown event target block");
    const trigger = event.trigger;
    if (
      trigger.kind !== "passage" &&
      !triggerTargets[trigger.kind].has(trigger[`${trigger.kind}Id`]!)
    )
      invalid("Unknown event trigger");
    if (event.action.kind === "audio" && assets.get(event.action.assetId)?.type !== "audio")
      invalid("Unknown audio cue");
  }
}
export function validateScenePresentation(
  scene: z.infer<typeof SceneSchema>,
  segments: string[],
  assets: Assets,
  palette: string[] | undefined,
  invalid: Issue,
) {
  const { blocks } = scene;
  const media = (blocks ?? []).filter(isMediaBlock);
  const ids = new Set(media.map((block) => block.id));
  if (ids.size !== media.length) invalid("Duplicate media block ID");
  if (blocks) {
    const textIds = blocks.filter((block) => block.kind === "text").map((block) => block.segmentId);
    const choices = blocks.filter((block) => block.kind === "choices");
    if (JSON.stringify(textIds) !== JSON.stringify(segments))
      invalid("Blocks must preserve every declared Ink segment in order");
    if (choices.length !== 1 || blocks.at(-1) !== choices[0])
      invalid("Choices must be the final block");
  }
  const events = scene.events ?? [];
  validateCues(events, ids, segments, assets, invalid);
  for (const block of media) validateMediaBlock(block, events, segments, assets, invalid);
  if (palette) for (const event of events) validateEffectColors(event, palette, invalid);
}
