import { z } from "zod";
import { BundleSchema } from "./story.ts";
import { ReadingPreferencesSchema } from "./presentation.ts";
import { CharacterSchema } from "./character.ts";

export const PreviewStateSchema = z
  .object({
    variables: z.record(z.string(), z.union([z.number().finite(), z.boolean(), z.string()])),
    character: CharacterSchema.optional(),
  })
  .strict();

const shape = BundleSchema.shape;
export const StoryConfigurationSchema = z
  .object({
    title: shape.title,
    checkpointId: shape.checkpointId,
    chapter: shape.chapter,
    scenes: shape.scenes,
    assets: shape.assets,
    panels: shape.panels,
    examination: shape.examination,
    character: shape.character,
    game: shape.game,
    narration: shape.narration,
    narratorVoices: shape.narratorVoices,
    narratorVoiceSelection: shape.narratorVoiceSelection,
    speechSettings: shape.speechSettings,
    voiceProfiles: shape.voiceProfiles,
    embeddedAudio: shape.embeddedAudio,
    artDirection: shape.artDirection,
  })
  .strict();

export const StoryProjectSchema = z
  .object({
    schemaVersion: z.literal(1),
    storyId: z.literal("house"),
    release: z.string().min(1).max(100),
    defaultLocale: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/),
    shareConfiguration: z.boolean().optional(),
    gameMode: z.enum(["narrative", "rpg-no-combat", "with-combat"]),
    variables: z.array(z.string()).max(100),
    mediaLibrary: z
      .array(
        z
          .object({
            id: z.string(),
            title: z.string(),
            category: z.string(),
            themes: z.array(z.string()),
            usage: z.array(z.string()),
            layerRoles: z.array(z.enum(["foreground", "midground", "background"])).optional(),
          })
          .strict(),
      )
      .max(1000)
      .optional(),
    languages: z.record(
      z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/),
      z
        .object({
          script: z.string().max(500_000),
          description: z.string().max(5000),
          cover: z.string().optional(),
          missingTranslation: z.boolean(),
          configuration: StoryConfigurationSchema,
          defaults: ReadingPreferencesSchema,
          narrationMode: z.enum(["ai-live", "ai-pregenerated", "human", "disabled"]),
        })
        .strict(),
    ),
  })
  .strict()
  .refine(
    (p) =>
      Object.keys(p.languages).length > 0 &&
      Object.keys(p.languages).length <= 32 &&
      Boolean(p.languages[p.defaultLocale]),
    "Missing default language",
  )
  // shortcut: embed small recordings in backups; use a separate blob archive above 8 MB.
  .refine(
    (project) => new TextEncoder().encode(JSON.stringify(project, null, 2)).byteLength <= 8_000_000,
    "Project backup exceeds 8 MB. Reduce embedded recordings before saving.",
  );
export type StoryProject = z.infer<typeof StoryProjectSchema>;

export const PublishedProjectSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    bundles: z.record(z.string(), BundleSchema),
    defaults: z.record(z.string(), ReadingPreferencesSchema),
  })
  .strict();
