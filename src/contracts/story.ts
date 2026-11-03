import { z } from "zod";

const id = z.string().regex(/^[a-z][a-z0-9.-]*$/);
export const LocaleSchema = z.enum(["en", "fr"]);
export type Locale = z.infer<typeof LocaleSchema>;

const SegmentSchema = z.object({ id, text: z.string().min(1).max(10_000) }).strict();
const ChoiceSchema = z.object({ id, text: z.string().min(1).max(500) }).strict();
export const FrameSchema = z
  .object({
    passageId: id,
    segments: z.array(SegmentSchema).min(1).max(100),
    choices: z.array(ChoiceSchema).max(20),
  })
  .strict();
export type Frame = z.infer<typeof FrameSchema>;

export const BundleSchema = z
  .object({
    schemaVersion: z.literal(1),
    storyId: id,
    release: z.string().min(1),
    locale: LocaleSchema,
    mode: z.literal("narrative"),
    title: z.string().min(1),
    chapter: z.string().min(1),
    inkDigest: z.string().regex(/^[a-f0-9]{64}$/),
    inkjsVersion: z.string().min(1),
    passages: z.record(id, z.array(id).min(1)),
    ink: z.record(z.string(), z.unknown()),
  })
  .strict();
export type StoryBundle = z.infer<typeof BundleSchema>;

export const StoryManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    storyId: id,
    defaultLocale: LocaleSchema,
    locales: z.array(LocaleSchema).min(1).max(2),
  })
  .strict()
  .refine(
    (manifest) =>
      manifest.locales.includes(manifest.defaultLocale) &&
      new Set(manifest.locales).size === manifest.locales.length,
  );
export type StoryManifest = z.infer<typeof StoryManifestSchema>;

export const SaveSchema = z
  .object({
    schemaVersion: z.literal(1),
    storyId: id,
    release: z.string(),
    locale: LocaleSchema,
    mode: z.literal("narrative"),
    inkDigest: z.string(),
    inkjsVersion: z.string(),
    runId: z.uuid(),
    revision: z.number().int().positive(),
    updatedAt: z.iso.datetime(),
    inkStateJson: z.string().min(1).max(500_000),
    frame: FrameSchema,
  })
  .strict();
export type SaveData = z.infer<typeof SaveSchema>;

export const SettingsSchema = z
  .object({
    schemaVersion: z.literal(2),
    language: LocaleSchema,
    welcomeSound: z.boolean(),
  })
  .strict();
export type ReaderSettings = z.infer<typeof SettingsSchema>;

export interface NarrativeEngine {
  advance(): Frame;
  choose(choiceId: string): void;
  serialize(): string;
  restore(state: string, frame?: Frame): void;
}

export type FailureCode =
  | "content"
  | "save-invalid"
  | "save-incompatible"
  | "save-conflict"
  | "storage";

export class ReaderFailure extends Error {
  readonly code: FailureCode;

  constructor(code: FailureCode) {
    super(code);
    this.name = "ReaderFailure";
    this.code = code;
  }
}
