import { z } from "zod";

import { NativeEffectSchema, NarrativeEventSchema } from "./effects.ts";

export const RuntimeAssetSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9.-]*$/),
    path: z.string().regex(/^media\/[a-z0-9.-]+\.(webp|mp3)$/),
    type: z.enum(["image", "audio"]),
    alt: z.string().max(500),
    credit: z.string().max(500).optional(),
  })
  .strict();

const PresentationBlockSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), segmentId: z.string() }).strict(),
  z
    .object({
      kind: z.literal("media"),
      id: z.string(),
      image: z.string(),
      layout: z.enum(["inline", "wide", "fullscreen", "background"]),
      widthPercent: z.number().min(10).max(100).optional(),
      align: z.enum(["left", "center", "right"]).optional(),
      fit: z.enum(["contain", "cover"]).optional(),
      show: z
        .object({
          kind: z.enum(["page", "segment", "delay"]),
          segmentId: z.string().optional(),
          delayMs: z.number().min(0).max(10000).optional(),
        })
        .strict()
        .refine((show) => show.kind !== "segment" || Boolean(show.segmentId))
        .optional(),
      durationMs: z.number().min(1).max(180000).optional(),
      photograph: z.boolean().optional(),
      caption: z.string().max(500).optional(),
    })
    .strict(),
  z.object({ kind: z.literal("choices") }).strict(),
]);
export type PresentationBlock = z.infer<typeof PresentationBlockSchema>;

export const SceneSchema = z
  .object({
    title: z.string().min(1),
    progress: z.number().min(0).max(1),
    image: z.string().optional(),
    sound: z.string().optional(),
    effect: NativeEffectSchema.optional(),
    events: z.array(NarrativeEventSchema).max(30).optional(),
    blocks: z.array(PresentationBlockSchema).min(1).max(120).optional(),
    photograph: z.boolean().optional(),
    notice: z.string().optional(),
  })
  .strict();

export const ExaminationSchema = z
  .object({
    image: z.string(),
    title: z.string(),
    descriptions: z.array(z.string()).min(1).max(10),
    reverse: z.string(),
    actionId: z.string(),
    hotspot: z
      .object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100), label: z.string() })
      .strict(),
  })
  .strict();

export const PanelSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    entries: z
      .array(
        z
          .object({
            label: z.string(),
            fact: z.string(),
            description: z.string().optional(),
            onlyWhenTrue: z.boolean().optional(),
          })
          .strict(),
      )
      .max(30),
  })
  .strict();

export const ReadingPreferencesSchema = z
  .object({
    fontSize: z.enum(["small", "medium", "large"]),
    fontFamily: z.enum(["serif", "sans"]),
    lineHeight: z.enum(["comfortable", "spacious"]),
    reveal: z.enum(["progressive", "instant"]),
    sound: z.boolean(),
    narration: z.boolean().optional(),
    deviceVoice: z.boolean().optional(),
    narrationRate: z.number().min(0.5).max(2).optional(),
    narratorVoice: z.string().max(80).optional(),
    volumes: z
      .object({
        sfx: z.number().min(0).max(1),
        ambience: z.number().min(0).max(1),
        music: z.number().min(0).max(1),
        narration: z.number().min(0).max(1),
      })
      .strict()
      .optional(),
  })
  .strict();
export type ReadingPreferences = z.infer<typeof ReadingPreferencesSchema>;
export const defaultReadingPreferences: ReadingPreferences = {
  fontSize: "medium",
  fontFamily: "serif",
  lineHeight: "comfortable",
  reveal: "progressive",
  sound: false,
};
