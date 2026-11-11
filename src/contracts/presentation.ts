import { z } from "zod";

import { NarrativeEventSchema } from "./narrative-events.ts";
import { NativeEffectSchema } from "./native-effects.ts";
import { CinematicSchema } from "./cinematic.ts";
import { Model3DSchema, Scene3DSchema } from "./scene3d.ts";
import { IllustrationSchema } from "./illustration.ts";

export function isMediaBlock(
  block: PresentationBlock,
): block is Extract<PresentationBlock, { kind: "media" }> {
  return block.kind === "media";
}

export function isFullscreenMedia(
  block: PresentationBlock,
): block is Extract<PresentationBlock, { kind: "media" }> & { layout: "fullscreen" } {
  return isMediaBlock(block) && block.layout === "fullscreen";
}

export function mediaIsVisible(
  block: Extract<PresentationBlock, { kind: "media" }>,
  state: { expiredMedia: string[]; visibleMedia: string[]; revealAll: boolean },
) {
  return (
    !state.expiredMedia.includes(block.id) &&
    (!block.show || state.revealAll || state.visibleMedia.includes(block.id))
  );
}

export const RuntimeAssetSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9.-]*$/),
    path: z.string().regex(/^media\/[a-z0-9.-]+\.(webp|mp3|mp4|webm|glb)$/),
    type: z.enum(["image", "audio", "video", "model3d"]),
    dimensions: z
      .object({
        width: z.number().int().positive().max(32768),
        height: z.number().int().positive().max(32768),
      })
      .strict()
      .optional(),
    model3d: Model3DSchema.optional(),
    scene3d: Scene3DSchema.optional(),
    upload: z
      .object({
        digest: z.string().regex(/^[a-f0-9]{64}$/),
        mime: z.enum(["video/mp4", "video/webm", "image/webp", "model/gltf-binary"]),
        size: z.number().int().positive().max(50_000_000),
        rights: z.string().trim().min(1).max(500),
        durationMs: z.number().positive().max(86400000).optional(),
      })
      .strict()
      .optional(),
    alt: z.string().max(500),
    credit: z.string().max(500).optional(),
  })
  .strict()
  .refine(function validAsset(asset) {
    return (
      (!asset.scene3d || ["image", "video"].includes(asset.type)) &&
      (!asset.model3d || asset.type === "model3d") &&
      (asset.type !== "model3d" ||
        Boolean(
          asset.model3d &&
          asset.upload?.mime === "model/gltf-binary" &&
          asset.upload.size <= 20_000_000,
        )) &&
      (!asset.upload ||
        ((asset.type === "video"
          ? asset.upload.mime.startsWith("video/") && Boolean(asset.upload.durationMs)
          : asset.type === "model3d"
            ? asset.upload.mime === "model/gltf-binary"
            : asset.type === "image" &&
              asset.upload.mime === "image/webp" &&
              asset.upload.size <= 10_000_000) &&
          asset.id === `upload.${asset.upload.digest}` &&
          asset.path ===
            `media/${asset.id}.${{ "video/mp4": "mp4", "video/webm": "webm", "image/webp": "webp", "model/gltf-binary": "glb" }[asset.upload.mime]}`))
    );
  }, "Invalid uploaded media identity");

export const ExaminationSchema = z
  .object({
    image: z.string(),
    title: z.string().min(1).max(100),
    buttonLabel: z.string().max(100).optional(),
    descriptions: z.array(z.string().max(1000)).min(1).max(10),
    reverse: z.string().max(5000).default(""),
    actionId: z.string().optional(),
    hotspot: z
      .object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100), label: z.string() })
      .strict()
      .optional(),
  })
  .strict();
export type ImageExamination = z.infer<typeof ExaminationSchema>;

const PresentationBlockSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), segmentId: z.string() }).strict(),
  z
    .object({
      kind: z.literal("media"),
      id: z.string(),
      image: z.string(),
      layout: z.enum(["inline", "wide", "right", "fullscreen", "background"]),
      widthPercent: z.number().min(10).max(100).optional(),
      align: z.enum(["left", "center", "right"]).optional(),
      fit: z.enum(["contain", "cover"]).optional(),
      position: z
        .object({ x: z.number().min(-100).max(100), y: z.number().min(-100).max(100) })
        .strict()
        .optional(),
      motion: CinematicSchema.optional(),
      illustration: IllustrationSchema.optional(),
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
      examination: ExaminationSchema.optional(),
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
    dropCapColor: z
      .string()
      .regex(/^#[a-fA-F0-9]{6}$/)
      .optional(),
    backgroundColor: z
      .string()
      .regex(/^#[a-fA-F0-9]{6}$/)
      .optional(),
    masterVolume: z.number().min(0).max(1).optional(),
    fontSize: z.enum(["small", "medium", "large"]),
    fontFamily: z.enum(["serif", "sans"]),
    lineHeight: z.enum(["comfortable", "spacious"]),
    reveal: z.enum(["progressive", "instant"]),
    sound: z.boolean(),
    narration: z.boolean().optional(),
    pageTurn: z.boolean().optional(),
    deviceVoice: z.boolean().optional(),
    narrationRate: z.number().min(0.5).max(2).optional(),
    narratorVoice: z.string().max(512).optional(),
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
/** Channel volumes used until the reader or the story sets their own. */
export const defaultVolumes = { sfx: 0.65, ambience: 0.3, music: 0.3, narration: 0.8 };
/** Device voices are a fallback only where the story does not require recorded narration. */
export function allowsDeviceVoice(narrationMode: string | undefined) {
  return !["disabled", "human", "ai-pregenerated"].includes(narrationMode ?? "");
}
export const defaultReadingPreferences: ReadingPreferences = {
  fontSize: "medium",
  fontFamily: "serif",
  lineHeight: "comfortable",
  reveal: "instant",
  // Entering a story is a user gesture (see unlockAudio), so its sound can start on.
  sound: true,
};

export type MediaAsset = z.infer<typeof RuntimeAssetSchema>;
