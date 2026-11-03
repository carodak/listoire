import { z } from "zod";
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
    speed: z.enum(["slow", "normal", "fast"]).default("normal"),
    intensity: z.enum(["subtle", "normal", "strong"]).default("subtle"),
    direction: z.enum(["auto", "up", "down", "left", "right"]).default("auto"),
    atmosphere: z.enum(atmospheres).default("none"),
    layers: z.array(z.string()).max(4).default([]),
  })
  .strict()
  .refine(
    (motion) => new Set(motion.layers).size === motion.layers.length,
    "Each depth layer must use a different image",
  );
export type Cinematic = z.infer<typeof CinematicSchema>;
