import { z } from "zod";
import { CinematicSchema } from "./cinematic.ts";
const duration = z.number().min(0).max(10000);
const timing = {
  duration,
  delay: z.number().min(0).max(5000).optional(),
  target: z.enum(["image", "canvas"]).optional(),
};
const color = z.string().regex(/^#[a-fA-F0-9]{3,8}$/);
const intensity = z.number().min(0).max(1);
const point = z.number().min(-25).max(25);
export const NativeEffectSchema = z.discriminatedUnion("id", [
  z.object({ id: z.literal("video-playback"), duration: z.number().min(0).max(180000) }).strict(),
  z
    .object({
      id: z.literal("cinematic-camera"),
      duration: z.number().min(0).max(60000),
      cinematic: CinematicSchema,
      target: z.literal("image").optional(),
    })
    .strict(),
  z
    .object({
      id: z.literal("page-turn"),
      duration,
      direction: z.enum(["forward", "back"]),
      target: z.literal("canvas").optional(),
    })
    .strict(),
  z.object({ id: z.literal("fade-in"), ...timing }).strict(),
  z.object({ id: z.literal("fade-out"), ...timing }).strict(),
  z.object({ id: z.literal("crossfade"), ...timing }).strict(),
  z.object({ id: z.literal("screen-shake"), ...timing, intensity: intensity.optional() }).strict(),
  z
    .object({
      id: z.literal("light-flicker"),
      ...timing,
      intensity: intensity.optional(),
      color: color.optional(),
    })
    .strict(),
  z.object({ id: z.literal("slow-zoom"), ...timing, scale: z.number().min(1).max(3) }).strict(),
  z.object({ id: z.literal("camera-zoom"), ...timing, scale: z.number().min(1).max(3) }).strict(),
  z.object({ id: z.literal("camera-pan"), ...timing, x: point, y: point }).strict(),
  z.object({ id: z.literal("parallax"), ...timing, x: point, y: point }).strict(),
  z.object({ id: z.literal("rain-overlay"), ...timing, intensity: intensity.optional() }).strict(),
  z.object({ id: z.literal("fog-overlay"), ...timing, intensity: intensity.optional() }).strict(),
  z
    .object({
      id: z.literal("cinematic-wipe"),
      ...timing,
      direction: z.enum(["left", "right", "up", "down"]),
    })
    .strict(),
]);
export type NativeEffect = z.infer<typeof NativeEffectSchema>;

const speed = z.number().min(0).max(3);
const dpr = z.number().min(0.5).max(1.5);
const opacity = z.number().min(0).max(0.3);
const rb = <T extends string, S extends z.ZodRawShape>(id: T, shape: S) =>
  z
    .object({
      id: z.literal(id),
      duration,
      props: z.object(shape).strict(),
      image: z.string().optional(),
    })
    .strict();
export const ReactBitsEffectSchema = z.discriminatedUnion("id", [
  rb("react-bits.light-rays", {
    raysColor: color.optional(),
    raysSpeed: speed.optional(),
    intensity: intensity.optional(),
    maxDevicePixelRatio: dpr.optional(),
  }),
  rb("react-bits.lightning", {
    color: color.optional(),
    speed: speed.optional(),
    intensity: intensity.optional(),
    flicker: z.number().min(0).max(0.1).optional(),
    dpr: dpr.optional(),
  }),
  rb("react-bits.particles", {
    particleCount: z.number().int().min(1).max(150).optional(),
    speed: speed.optional(),
    particleColors: z.array(color).max(6).optional(),
    pixelRatio: dpr.optional(),
  }),
  rb("react-bits.dark-veil", {
    color: color.optional(),
    speed: speed.optional(),
    brightness: intensity.optional(),
    dpr: dpr.optional(),
  }),
  rb("react-bits.magic-rings", {
    color: color.optional(),
    colorTwo: color.optional(),
    ringCount: z.number().int().min(1).max(8).optional(),
    speed: speed.optional(),
    maxDevicePixelRatio: dpr.optional(),
  }),
  rb("react-bits.noise", {
    opacity: opacity.optional(),
    size: z.number().min(0.5).max(4).optional(),
    fps: z.number().int().min(1).max(24).optional(),
    flicker: z.number().min(0).max(0.05).optional(),
  }),
  rb("react-bits.ripple-distortion", {
    strength: intensity.optional(),
    brushSize: z.number().min(0.01).max(0.5).optional(),
    quality: z.enum(["low", "medium"]).optional(),
  }),
  rb("react-bits.aurora", {
    colorStops: z.array(color).min(2).max(5).optional(),
    amplitude: intensity.optional(),
    speed: speed.optional(),
    dpr: dpr.optional(),
  }),
  rb("react-bits.side-rays", {
    rayColor1: color.optional(),
    rayColor2: color.optional(),
    speed: speed.optional(),
    intensity: intensity.optional(),
    maxDevicePixelRatio: dpr.optional(),
  }),
  rb("react-bits.light-pillar", {
    topColor: color.optional(),
    bottomColor: color.optional(),
    intensity: intensity.optional(),
    quality: z.enum(["low", "medium"]).optional(),
    resolution: z.number().min(0.25).max(1).optional(),
  }),
  rb("react-bits.splash-cursor", {
    colors: z.array(color).min(1).max(5).optional(),
    intensity: intensity.optional(),
    quality: z.enum(["low", "medium"]).optional(),
    contained: z.literal(true).optional(),
  }),
  rb("react-bits.grid-distortion", {
    grid: z.number().int().min(2).max(24).optional(),
    strength: intensity.optional(),
    chroma: z.number().min(0).max(0.2).optional(),
  }),
  rb("react-bits.prismatic-burst", {
    colors: z.array(color).min(1).max(5).optional(),
    intensity: intensity.optional(),
    speed: speed.optional(),
    quality: z.enum(["low", "medium"]).optional(),
    dpr: dpr.optional(),
  }),
  rb("react-bits.ghost-fibers", {
    lineColor: color.optional(),
    glowColor: color.optional(),
    speed: speed.optional(),
    threads: z.number().int().min(1).max(80).optional(),
  }),
]);
export type ReactBitsEffect = z.infer<typeof ReactBitsEffectSchema>;
export type ReactBitsId = ReactBitsEffect["id"];
export const NarrativeEventSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9.-]*$/),
    phase: z.enum(["enter", "exit"]).optional(),
    trigger: z
      .object({
        kind: z.enum(["passage", "segment", "block"]),
        segmentId: z.string().optional(),
        blockId: z.string().optional(),
      })
      .strict(),
    delayMs: z.number().min(0).max(10000).optional(),
    blocking: z.boolean().optional(),
    blockId: z.string().optional(),
    action: z.union([
      z
        .object({
          kind: z.literal("effect"),
          effect: z.union([NativeEffectSchema, ReactBitsEffectSchema]),
        })
        .strict(),
      z
        .object({
          kind: z.literal("audio"),
          assetId: z.string(),
          channel: z.enum(["sfx", "ambience", "music"]),
          loop: z.boolean().optional(),
          volume: z.number().min(0).max(1).optional(),
          fadeMs: z.number().min(0).max(3000).optional(),
        })
        .strict(),
      z
        .object({ kind: z.literal("stop-audio"), channel: z.enum(["sfx", "ambience", "music"]) })
        .strict(),
    ]),
  })
  .strict()
  .refine(
    (event) =>
      (event.trigger.kind !== "segment" || Boolean(event.trigger.segmentId)) &&
      (event.trigger.kind !== "block" || Boolean(event.trigger.blockId)),
  );
export type NarrativeEvent = z.infer<typeof NarrativeEventSchema>;
