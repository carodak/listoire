import { z } from "zod";
export const SpeechSettingsSchema = z
  .object({
    temperature: z.number().min(0.1).max(2),
    exaggeration: z.number().min(0).max(2),
    cfgWeight: z.number().min(0).max(1),
    seed: z.number().int().min(0).max(2147483647),
    pitch: z.number().min(-12).max(12),
  })
  .strict();
export const VoiceProfileSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9.-]{0,100}$/),
    label: z.string().min(1).max(80),
    model: z.enum(["nano", "multilingual-v3"]),
    reference: z
      .object({
        name: z.string().max(120),
        data: z
          .string()
          .max(6_800_000)
          .regex(/^data:audio\/(mpeg|wav);base64,[A-Za-z0-9+/]+=*$/),
        rights: z.string().min(1).max(500),
      })
      .strict()
      .optional(),
  })
  .strict();
export type SpeechSettings = z.infer<typeof SpeechSettingsSchema>;
export type VoiceProfile = z.infer<typeof VoiceProfileSchema>;
export const defaultSpeechSettings: SpeechSettings = {
  temperature: 0.7,
  exaggeration: 0.4,
  cfgWeight: 0.4,
  seed: 4812,
  pitch: 0,
};
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
