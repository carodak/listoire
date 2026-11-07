import type { StoryProject } from "../../contracts/editor-project.ts";
import { CinematicSchema } from "../../contracts/cinematic.ts";
import type { MediaEdit, MediaBlock, Scene } from "./media-edit.ts";

const emptyMedia: Omit<MediaEdit, "kind" | "sceneId" | "id" | "loop"> = {
  shared: false,
  asset: "",
  layout: "inline",
  examination: null,
  alt: "",
  caption: "",
  width: 100,
  align: "center",
  fit: "cover",
  positionOverride: false,
  x: 0,
  y: 0,
  motion: CinematicSchema.parse({ preset: "none" }),
  illustration: null,
  show: "page",
  segment: "",
  delay: 0,
  persistence: 0,
  effect: "fade-in",
  target: "page",
  duration: 1800,
  intensity: 0.3,
  volume: 0.65,
  fade: 350,
  stop: false,
};

export function mediaDefaults(kind: string, sceneId: string, id: string, scene?: Scene): MediaEdit {
  const input: MediaEdit = {
    ...structuredClone(emptyMedia),
    kind,
    sceneId,
    id,
    loop: kind === "Background Music",
  };
  const block = scene?.blocks?.find(
    (block): block is MediaBlock => block.kind === "media" && block.id === id,
  );
  if (block) Object.assign(input, imageDefaults(block));
  const hold = scene?.events?.find(
    (event) =>
      event.blockId === id &&
      event.blocking &&
      event.action.kind === "effect" &&
      event.action.effect.id === "cinematic-camera",
  );
  if (
    kind === "Image" &&
    block?.layout === "fullscreen" &&
    input.motion.preset === "none" &&
    !input.motion.durationMs &&
    hold?.action.kind === "effect"
  )
    input.motion = { ...input.motion, durationMs: hold.action.effect.duration };
  const event = scene?.events?.find((event) => event.id === id);
  if (event) {
    input.segment = event.trigger.segmentId ?? "";
    input.delay = event.delayMs ?? 0;
    input.target =
      event.phase === "exit" ? "transition" : (event.blockId ?? event.trigger.blockId ?? "page");
  }
  const action = event?.action;
  if (action?.kind === "effect") {
    input.effect = action.effect.id;
    input.duration = action.effect.duration;
    if ("intensity" in action.effect) input.intensity = action.effect.intensity ?? 0.3;
  }
  if (action?.kind === "audio")
    Object.assign(input, {
      asset: action.assetId,
      volume: action.volume ?? 0.65,
      loop: action.loop ?? false,
      fade: action.fadeMs ?? 350,
    });
  input.stop = action?.kind === "stop-audio";
  return input;
}
function imageDefaults(block: MediaBlock) {
  return {
    asset: block.image,
    layout: block.layout,
    examination: block.examination ?? (block.photograph ? undefined : null),
    caption: block.caption ?? "",
    width: block.widthPercent ?? 100,
    align: block.align ?? "center",
    fit: block.fit ?? (block.layout === "fullscreen" ? "cover" : "contain"),
    ...imagePosition(block),
    motion: block.motion ?? CinematicSchema.parse({ preset: "none" }),
    illustration: block.illustration ?? null,
    show: block.show?.kind ?? "page",
    segment: block.show?.segmentId ?? "",
    delay: block.show?.delayMs ?? 0,
    persistence: block.durationMs ?? 0,
  };
}

function imagePosition(block: MediaBlock) {
  return {
    positionOverride: Boolean(block.position),
    x: block.position?.x ?? 0,
    y: block.position?.y ?? 0,
  };
}

export function mediaContext(
  language: StoryProject["languages"][string],
  sceneId: string,
  asset: string,
  selectedId?: string,
) {
  const scene = language.configuration.scenes?.[sceneId];
  const chosen = language.configuration.assets?.find((a) => a.id === asset);
  return {
    segmentIds: [...language.script.matchAll(/#\s*segment:([a-z][a-z0-9.-]*)/g)]
      .map((m) => m[1]!)
      .filter((id) => id.startsWith(`${sceneId}.`)),
    alt: chosen?.alt ?? "",
    assetUrl: chosen ? `/stories/house/${chosen.path}` : undefined,
    blocks: scene?.blocks?.filter((b) => b.kind === "media").map((b) => b.id) ?? [],
    trigger: scene?.events?.find((e) => e.id === selectedId)?.trigger.kind ?? "passage",
  };
}
