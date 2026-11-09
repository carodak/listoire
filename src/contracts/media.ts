import { z } from "zod";
export const NarrationClipSchema = z
  .object({
    segmentId: z.string(),
    locale: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/),
    voiceId: z.string(),
    settingsKey: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    spokenTextDigest: z.string().regex(/^[a-f0-9]{64}$/),
    assetId: z.string(),
    audioDigest: z.string().regex(/^[a-f0-9]{64}$/),
    durationMs: z.number().positive().max(180000),
    marks: z
      .array(
        z
          .object({
            character: z.number().int().min(0),
            startMs: z.number().min(0),
            endMs: z.number().min(0),
          })
          .strict(),
      )
      .max(1000),
    approval: z
      .object({
        status: z.enum(["approved", "preview"]),
        reviewer: z.string().min(1),
        rightsReference: z.string().min(1),
      })
      .strict(),
  })
  .strict()
  .refine((clip) =>
    clip.marks.every(
      (mark, index) =>
        mark.endMs >= mark.startMs &&
        mark.endMs <= clip.durationMs &&
        (index === 0 || mark.startMs >= clip.marks[index - 1]!.startMs),
    ),
  );
export type NarrationClip = z.infer<typeof NarrationClipSchema>;
export interface NarrationProgress {
  segmentId: string;
  characters: number;
  done: boolean;
}
