import { z } from "zod";
import { IdSchema } from "./primitives.ts";
import { NativeEffectSchema } from "./native-effects.ts";
import { ReactBitsEffectSchema } from "./effects.ts";
export const NarrativeEventSchema = z
  .object({
    id: IdSchema,
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
  )
  .refine(
    (event) =>
      event.phase !== "exit" ||
      (event.blockId === "page" &&
        event.trigger.kind === "passage" &&
        event.action.kind === "effect" &&
        event.action.effect.id === "fade-out"),
    "Scene transitions require a page fade-out on passage exit",
  );
export type NarrativeEvent = z.infer<typeof NarrativeEventSchema>;
