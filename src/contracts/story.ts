import { z } from "zod";
import { CharacterDefinitionSchema, CharacterSchema } from "./character.ts";
import { NarrationClipSchema, SpeechSettingsSchema, VoiceProfileSchema } from "./media.ts";
import { validateScenePresentation } from "./presentation-validation.ts";
import {
  ExaminationSchema,
  PanelSchema,
  ReadingPreferencesSchema,
  RuntimeAssetSchema,
  SceneSchema,
} from "./presentation.ts";

const id = z.string().regex(/^[a-z][a-z0-9.-]*$/);
export const LocaleSchema = z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/);
export type Locale = z.infer<typeof LocaleSchema>;

const SegmentSchema = z.object({ id, text: z.string().min(1).max(10_000) }).strict();
const ChoiceSchema = z.object({ id, text: z.string().min(1).max(500) }).strict();
export const FrameSchema = z
  .object({
    passageId: id,
    segments: z.array(SegmentSchema).min(1).max(100),
    choices: z.array(ChoiceSchema).max(20),
    actions: z.array(ChoiceSchema).max(10).optional(),
    facts: z.record(id, z.union([z.number().finite(), z.boolean(), z.string()])).optional(),
  })
  .strict();
export type Frame = z.infer<typeof FrameSchema>;

export const BundleSchema = z
  .object({
    schemaVersion: z.literal(1),
    storyId: id,
    release: z.string().min(1),
    locale: LocaleSchema,
    mode: z.enum(["narrative", "rpg-no-combat"]),
    title: z.string().min(1),
    chapter: z.string().min(1),
    inkDigest: z.string().regex(/^[a-f0-9]{64}$/),
    inkjsVersion: z.string().min(1),
    authored: z.boolean().optional(),
    narrationMode: z.enum(["ai-live", "ai-pregenerated", "human", "disabled"]).optional(),
    readingDefaults: ReadingPreferencesSchema.optional(),
    narratorVoiceSelection: z.array(z.string()).max(8).optional(),
    speechSettings: SpeechSettingsSchema.optional(),
    voiceProfiles: z.array(VoiceProfileSchema).max(8).optional(),
    embeddedAudio: z
      .record(
        z.string(),
        z
          .string()
          .max(7_000_000)
          .regex(/^data:audio\/mpeg;base64,[A-Za-z0-9+/]+=*$/),
      )
      .optional(),
    passages: z.record(id, z.array(id).min(1)),
    ink: z.record(z.string(), z.unknown()),
    variables: z.array(id).max(30).optional(),
    scenes: z.record(id, SceneSchema).optional(),
    assets: z.array(RuntimeAssetSchema).max(500).optional(),
    panels: z.array(PanelSchema).max(5).optional(),
    examination: ExaminationSchema.optional(),
    character: CharacterDefinitionSchema.optional(),
    narration: z.array(NarrationClipSchema).max(500).optional(),
    narratorVoices: z
      .array(z.object({ id: z.string(), label: z.string() }).strict())
      .max(8)
      .optional(),
    artDirection: z
      .object({
        style: z.string(),
        colorMode: z.literal("grayscale"),
        palette: z
          .array(z.string().regex(/^#[a-fA-F0-9]{6}$/))
          .min(2)
          .max(8),
        complexity: z.string(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((bundle, context) => {
    const invalid = (message: string) => context.addIssue({ code: "custom", message });
    const assets = new Map(bundle.assets?.map((asset) => [asset.id, asset]));
    if (assets.size !== (bundle.assets?.length ?? 0)) invalid("Duplicate asset ID");
    for (const [passageId, scene] of Object.entries(bundle.scenes ?? {})) {
      if (!bundle.passages[passageId]) invalid("Unknown scene passage");
      validateScenePresentation(
        scene,
        (bundle.passages[passageId] ?? []).filter(
          (segment) => !bundle.authored || segment !== "text",
        ),
        assets,
        bundle.artDirection?.palette,
        invalid,
      );
    }
    for (const clip of bundle.narration ?? [])
      if (
        !Object.values(bundle.passages).some((segments) => segments.includes(clip.segmentId)) ||
        assets.get(clip.assetId)?.type !== "audio" ||
        clip.locale !== bundle.locale
      )
        invalid("Invalid narration reference");
  });
export type StoryBundle = z.infer<typeof BundleSchema>;

export const StoryManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    storyId: id,
    defaultLocale: LocaleSchema,
    locales: z.array(LocaleSchema).min(1).max(32),
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
    mode: z.enum(["narrative", "rpg-no-combat"]),
    inkDigest: z.string(),
    inkjsVersion: z.string(),
    runId: z.uuid(),
    revision: z.number().int().positive(),
    updatedAt: z.iso.datetime(),
    inkStateJson: z.string().min(1).max(500_000),
    frame: FrameSchema,
    character: CharacterSchema.optional(),
  })
  .strict()
  .refine((save) => (save.mode === "rpg-no-combat" ? Boolean(save.character) : !save.character));
export type SaveData = z.infer<typeof SaveSchema>;

export const SettingsSchema = z
  .object({
    schemaVersion: z.literal(2),
    language: z.enum(["en", "fr"]),
    welcomeSound: z.boolean(),
    reading: ReadingPreferencesSchema.optional(),
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
