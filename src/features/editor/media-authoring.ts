import type { StoryProject } from "../../contracts/editor-project.ts";
import { SceneSchema } from "../../contracts/presentation.ts";
import type { PresentationBlock } from "../../contracts/presentation.ts";
import type { NarrativeEvent } from "../../contracts/effects.ts";
import { NativeEffectSchema, ReactBitsEffectSchema } from "../../contracts/effects.ts";
import { animationOptions } from "./animation-options.ts";
import { CinematicSchema } from "../../contracts/cinematic.ts";
import type { Cinematic } from "../../contracts/cinematic.ts";
import { cinematicDuration } from "../presentation/cinematic-presets.ts";

type MediaBlock = Extract<PresentationBlock, { kind: "media" }>;
type Scene = NonNullable<StoryProject["languages"][string]["configuration"]["scenes"]>[string];
export interface MediaEdit {
  kind: string;
  sceneId: string;
  id: string;
  shared: boolean;
  asset: string;
  layout: MediaBlock["layout"];
  alt: string;
  caption: string;
  width: number;
  align: "left" | "center" | "right";
  fit: "contain" | "cover";
  positionOverride: boolean;
  x: number;
  y: number;
  motion: Cinematic;
  show: "page" | "segment" | "delay";
  segment: string;
  delay: number;
  persistence: number;
  effect: string;
  target: string;
  duration: number;
  intensity: number;
  volume: number;
  loop: boolean;
  fade: number;
  stop: boolean;
}

export function mediaDefaults(kind: string, sceneId: string, id: string, scene?: Scene): MediaEdit {
  const input: MediaEdit = {
    kind,
    sceneId,
    id,
    shared: false,
    asset: "",
    layout: "inline",
    alt: "",
    caption: "",
    width: 100,
    align: "center",
    fit: "cover",
    positionOverride: false,
    x: 0,
    y: 0,
    motion: CinematicSchema.parse({ preset: "none" }),
    show: "page",
    segment: "",
    delay: 0,
    persistence: 0,
    effect: "fade-in",
    target: "page",
    duration: 1800,
    intensity: 0.3,
    volume: 0.65,
    loop: kind === "Background Music",
    fade: 350,
    stop: false,
  };
  const block = scene?.blocks?.find(
    (block): block is MediaBlock => block.kind === "media" && block.id === id,
  );
  if (block) Object.assign(input, imageDefaults(block));
  const event = scene?.events?.find((event) => event.id === id);
  if (event) {
    input.segment = event.trigger.segmentId ?? "";
    input.delay = event.delayMs ?? 0;
    input.target = event.phase === "exit" ? "transition" : (event.blockId ?? "page");
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
    caption: block.caption ?? "",
    width: block.widthPercent ?? 100,
    align: block.align ?? "center",
    fit: block.fit ?? (block.layout === "fullscreen" ? "cover" : "contain"),
    positionOverride: Boolean(block.position),
    x: block.position?.x ?? 0,
    y: block.position?.y ?? 0,
    motion: block.motion ?? CinematicSchema.parse({ preset: "none" }),
    show: block.show?.kind ?? "page",
    segment: block.show?.segmentId ?? "",
    delay: block.show?.delayMs ?? 0,
    persistence: block.durationMs ?? 0,
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

function imageScene(scene: Scene, input: MediaEdit, segmentIds: string[]) {
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
    caption: input.caption,
    widthPercent: input.width,
    align: input.align,
    fit: input.fit,
    position: input.positionOverride ? { x: input.x, y: input.y } : undefined,
    motion: input.motion,
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
  const motionId = `${input.id}.motion`;
  scene.events = scene.events?.filter((event) => event.id !== motionId);
  if (input.motion.preset !== "none") {
    scene.events ??= [];
    scene.events = scene.events.filter((event) => event.id !== `${input.id}.cinematic`);
    scene.events.push({
      id: motionId,
      blockId: input.id,
      trigger: { kind: "block", blockId: input.id },
      blocking: input.layout === "fullscreen",
      action: {
        kind: "effect",
        effect: {
          id: "cinematic-camera",
          duration: cinematicDuration(input.motion.speed),
          cinematic: input.motion,
        },
      },
    });
  }
  if (
    input.layout === "fullscreen" &&
    !scene.events?.some((e) => e.blockId === input.id && e.blocking)
  ) {
    scene.events ??= [];
    scene.events.push({
      id: `${input.id}.cinematic`,
      trigger: { kind: "block", blockId: input.id },
      blocking: true,
      blockId: input.id,
      action: {
        kind: "effect",
        effect:
          input.kind === "Video"
            ? { id: "video-playback", duration: input.duration }
            : { id: "slow-zoom", duration: input.duration, scale: 1.08 },
      },
    });
  }
  return scene;
}

function animationAction(input: MediaEdit, original?: NarrativeEvent): NarrativeEvent["action"] {
  const previous = original?.action;
  if (input.effect.startsWith("react-bits.")) {
    if (previous?.kind === "effect" && previous.effect.id === input.effect)
      return { kind: "effect", effect: { ...previous.effect, duration: input.duration } };
    return {
      kind: "effect",
      effect: ReactBitsEffectSchema.parse({
        id: input.effect,
        duration: input.duration,
        props: {},
      }),
    };
  }
  const parameters: Record<string, unknown> = {
    ...(previous?.kind === "effect" && previous.effect.id === input.effect ? previous.effect : {}),
    id: input.effect,
    duration: input.duration,
    target: ["page", "transition"].includes(input.target) ? "canvas" : "image",
  };
  if (["slow-zoom", "camera-zoom"].includes(input.effect)) parameters.scale ??= 1.08;
  if (["camera-pan", "parallax"].includes(input.effect)) {
    parameters.x ??= 3;
    parameters.y ??= 0;
  }
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

function cueScene(scene: Scene, input: MediaEdit, trigger: string) {
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

export function applyMediaEdit(
  project: StoryProject,
  locale: string,
  input: MediaEdit,
  segmentIds: string[],
  trigger: string,
) {
  const next = structuredClone(project);
  const locales = input.shared ? Object.keys(next.languages) : [locale];
  for (const languageId of locales) {
    const language = next.languages[languageId]!;
    const sourceAsset = next.languages[locale]!.configuration.assets?.find(
      (asset) => asset.id === input.asset,
    );
    if (sourceAsset && !language.configuration.assets?.some((asset) => asset.id === sourceAsset.id))
      language.configuration.assets = [...(language.configuration.assets ?? []), sourceAsset];
    const scene = language.configuration.scenes?.[input.sceneId] ?? {
      title: input.sceneId,
      progress: 0,
    };
    const result = ["Image", "Video"].includes(input.kind)
      ? imageScene(scene, input, segmentIds)
      : cueScene(scene, input, trigger);
    language.configuration.scenes = {
      ...language.configuration.scenes,
      [input.sceneId]: SceneSchema.parse(result),
    };
    if (["Image", "Video"].includes(input.kind) && input.alt)
      language.configuration.assets = language.configuration.assets?.map((asset) =>
        asset.id === input.asset ? { ...asset, alt: input.alt } : asset,
      );
  }
  return next;
}
