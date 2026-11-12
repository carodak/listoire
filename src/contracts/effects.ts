import { z } from "zod";
import { HexColorSchema } from "./primitives.ts";
const duration = z.number().min(0).max(10000);
const color = HexColorSchema;
const intensity = z.number().min(0).max(1);
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
