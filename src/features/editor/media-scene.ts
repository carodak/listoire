import type { NarrativeEvent } from "../../contracts/narrative-events.ts";
import { ReactBitsEffectSchema } from "../../contracts/effects.ts";
import { NativeEffectSchema } from "../../contracts/native-effects.ts";
import { CinematicSchema } from "../../contracts/cinematic.ts";
import { cinematicDuration } from "../presentation/cinematic-presets.ts";
import { animationOptions } from "./animation-options.ts";
import type { MediaEdit, MediaBlock, Scene } from "./media-edit.ts";

function examinationProperties(original: MediaBlock | undefined, input: MediaEdit) {
  if (input.layout === "fullscreen" || !["Image", "3D Scene"].includes(input.kind))
    return { photograph: false, examination: undefined };
  if (input.examination === undefined)
    return { photograph: original?.photograph, examination: original?.examination };
  return {
    photograph: false,
    examination: input.examination ? { ...input.examination, image: input.asset } : undefined,
  };
}

export function imageScene(
  scene: Scene,
  input: MediaEdit,
  segmentIds: string[],
  cached3d = false,
  video = false,
) {
  const original = scene.blocks?.find(
    (b): b is MediaBlock => b.kind === "media" && b.id === input.id,
  );
  if (!input.asset) throw new Error("Select a licensed image.");
  if (original && scene.image === original.image) scene.image = input.asset;
  const block: MediaBlock = {
    ...original,
    kind: "media",
    id: input.id,
    image: input.asset,
    layout: input.layout,
    ...examinationProperties(original, input),
    caption: input.caption,
    widthPercent: input.width,
    align: input.align,
    fit: input.fit,
    position: input.positionOverride ? { x: input.x, y: input.y } : undefined,
    motion: imageUsesDepth(input) ? input.motion : CinematicSchema.parse({ preset: "none" }),
    illustration: illustrationProperties(input),
    show: {
      kind: input.show,
      segmentId: input.show === "segment" ? input.segment : undefined,
      delayMs: input.delay,
    },
    durationMs: input.persistence || undefined,
  };
  scene.blocks ??= [
    ...segmentIds.map((segmentId) => ({ kind: "text" as const, segmentId })),
    { kind: "choices" },
  ];
  const position = scene.blocks.findIndex((b) => b.kind === "media" && b.id === input.id);
  if (position >= 0) scene.blocks[position] = block;
  else scene.blocks.splice(Math.max(0, scene.blocks.length - 1), 0, block);
  imageMotion(scene, input, cached3d, video);
  return scene;
}

function imageUsesDepth(input: MediaEdit) {
  return (
    input.kind === "Image" &&
    Boolean(input.illustration?.layers.length || input.motion.layers.length)
  );
}

function imageMotion(scene: Scene, input: MediaEdit, cached3d: boolean, video: boolean) {
  const motionId = `${input.id}.motion`;
  const simpleId = `${input.id}.simple`;
  const events = (scene.events ?? []).filter(
    (event) => ![motionId, simpleId, `${input.id}.cinematic`].includes(event.id),
  );
  scene.events = events;
  if (
    input.kind === "Image" &&
    !imageUsesDepth(input) &&
    ["fade-in", "fade-out"].includes(input.effect)
  ) {
    events.push({
      id: simpleId,
      blockId: input.id,
      trigger: { kind: "block", blockId: input.id },
      blocking: false,
      action: {
        kind: "effect",
        effect: { id: input.effect as "fade-in" | "fade-out", duration: 650, target: "image" },
      },
    });
  }
  if (imageUsesDepth(input) && input.motion.preset !== "none" && !cached3d) {
    events.push({
      id: motionId,
      blockId: input.id,
      trigger: { kind: "block", blockId: input.id },
      blocking: input.layout === "fullscreen",
      action: {
        kind: "effect",
        effect: {
          id: "cinematic-camera",
          duration: cinematicDuration(input.motion.speed, input.motion),
          cinematic: input.motion,
        },
      },
    });
  }
  if (input.layout === "fullscreen" && !events.some((e) => e.blockId === input.id && e.blocking)) {
    events.push({
      id: `${input.id}.cinematic`,
      trigger: { kind: "block", blockId: input.id },
      blocking: true,
      blockId: input.id,
      action: {
        kind: "effect",
        effect: video
          ? { id: "video-playback", duration: input.duration }
          : {
              id: "cinematic-camera",
              duration: cinematicDuration(input.motion.speed, input.motion),
              cinematic: CinematicSchema.parse({ preset: "none" }),
            },
      },
    });
  }
}

function illustrationProperties(input: MediaEdit) {
  if (input.kind !== "Image" || !input.illustration) return undefined;
  return {
    ...input.illustration,
    wrap: input.layout === "inline" ? input.illustration.wrap : ("none" as const),
  };
}

function animationAction(input: MediaEdit, original?: NarrativeEvent): NarrativeEvent["action"] {
  const previous = original?.action;
  const retained =
    previous?.kind === "effect" && previous.effect.id === input.effect ? previous.effect : {};
  if (input.effect.startsWith("react-bits.")) {
    return {
      kind: "effect",
      effect: ReactBitsEffectSchema.parse({
        id: input.effect,
        props: {},
        ...retained,
        duration: input.duration,
      }),
    };
  }
  const defaults: Record<string, Record<string, unknown>> = {
    "slow-zoom": { scale: 1.08 },
    "camera-zoom": { scale: 1.08 },
    "camera-pan": { x: 3, y: 0 },
    parallax: { x: 3, y: 0 },
  };
  const parameters: Record<string, unknown> = {
    ...defaults[input.effect],
    ...retained,
    id: input.effect,
    duration: input.duration,
    target: ["page", "transition"].includes(input.target) ? "canvas" : "image",
  };
  if (["screen-shake", "light-flicker", "fog-overlay", "rain-overlay"].includes(input.effect))
    parameters.intensity = input.intensity;
  return { kind: "effect", effect: NativeEffectSchema.parse(parameters) };
}

function audioAction(input: MediaEdit, original?: NarrativeEvent): NarrativeEvent["action"] {
  const previous = original?.action;
  const channel =
    input.kind === "Background Music"
      ? "music"
      : previous?.kind === "audio"
        ? previous.channel
        : "sfx";
  if (input.stop) return { kind: "stop-audio", channel };
  if (!input.asset) throw new Error("Select an audio asset.");
  return {
    kind: "audio",
    assetId: input.asset,
    channel,
    volume: input.volume,
    loop: input.loop,
    fadeMs: input.fade,
  };
}

export function cueScene(scene: Scene, input: MediaEdit, trigger: string) {
  const original = scene.events?.find((event) => event.id === input.id);
  const timing =
    trigger === "segment"
      ? { kind: "segment" as const, segmentId: input.segment }
      : trigger === "block"
        ? { kind: "block" as const, blockId: input.target }
        : { kind: "passage" as const };
  const animation = input.kind === "Animation";
  if (
    animation &&
    !animationOptions(
      input.target,
      scene.blocks?.filter((block) => block.kind === "media").map((block) => block.id) ?? [],
    ).includes(input.effect)
  )
    throw new Error("This animation is not compatible with its target.");
  const cue: NarrativeEvent = {
    ...original,
    id: input.id,
    trigger: input.target === "transition" ? { kind: "passage" } : timing,
    delayMs: input.delay,
    blocking: original?.blocking ?? false,
    ...(animation
      ? {
          blockId: input.target === "transition" ? "page" : input.target,
          phase: input.target === "transition" ? ("exit" as const) : ("enter" as const),
        }
      : {}),
    action: animation ? animationAction(input, original) : audioAction(input, original),
  };
  scene.events = [...(scene.events ?? []).filter((event) => event.id !== input.id), cue];
  return scene;
}
