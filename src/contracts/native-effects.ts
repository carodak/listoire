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
