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
