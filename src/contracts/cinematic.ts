import { z } from "zod";
export const cinematicSpeeds = ["slow", "normal", "fast"] as const;
export const cinematicIntensities = ["subtle", "normal", "strong"] as const;
export const cinematicDirections = ["auto", "up", "down", "left", "right"] as const;
export const cameraPresets = [
  "none",
  "slow-reveal",
  "dramatic-push",
  "downward-reveal",
  "upward-reveal",
  "cinematic-drift",
  "perspective-reveal",
  "suspense",
  "parallax",
  "auto-parallax",
  "gentle-depth",
  "cinematic-push-in",
  "sideways-drift",
  "character-focus",
  "atmospheric-still",
  "dramatic-descent",
  "handheld-discovery",
  "dolly-pullback",
  "sweeping-arrival",
  "rising-focus",
  "impact-push",
  "low-diagonal-pullback",
  "deep-pullback",
  "high-arrival-hold-pullback",
] as const;
export const illustrationPresets = [
  "none",
  "gentle-depth",
  "cinematic-push-in",
  "downward-reveal",
  "sideways-drift",
  "character-focus",
  "atmospheric-still",
  "dramatic-descent",
  "handheld-discovery",
  "dolly-pullback",
  "sweeping-arrival",
  "rising-focus",
  "impact-push",
  "low-diagonal-pullback",
  "deep-pullback",
  "high-arrival-hold-pullback",
] as const;
export const atmospheres = [
  "none",
  "historical",
  "mystery",
  "fantasy",
  "dreamlike",
  "dramatic",
] as const;
export const CinematicSchema = z
  .object({
    preset: z.enum(cameraPresets),
    speed: z.enum(cinematicSpeeds).default("normal"),
    intensity: z.enum(cinematicIntensities).default("subtle"),
    direction: z.enum(cinematicDirections).default("auto"),
    atmosphere: z.enum(atmospheres).default("none"),
    layers: z.array(z.string()).max(4).default([]),
    durationMs: z.number().min(1000).max(30000).optional(),
  })
  .strict()
  .refine(
    (motion) => new Set(motion.layers).size === motion.layers.length,
    "Each depth layer must use a different image",
  );
export type Cinematic = z.infer<typeof CinematicSchema>;
