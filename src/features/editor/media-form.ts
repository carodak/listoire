import type { StoryProject } from "../../contracts/editor-project.ts";
import { CinematicSchema } from "../../contracts/cinematic.ts";
import type { ImageDraft, MediaEdit, MediaBlock, Scene } from "./media-edit.ts";
import type { ImageExamination } from "../../contracts/presentation.ts";
import { illustrationDefaults } from "../../contracts/illustration.ts";

const emptyMedia: Omit<MediaEdit, "kind" | "sceneId" | "id" | "loop"> = {
  shared: false,
  asset: "",
  layout: "inline",
  examination: null,
  alt: "",
  caption: "",
  width: 100,
  align: "center",
  fit: "cover",
  positionOverride: false,
  x: 0,
  y: 0,
  motion: CinematicSchema.parse({ preset: "none" }),
  illustration: null,
  show: "page",
  segment: "",
  delay: 0,
  persistence: 0,
  effect: "fade-in",
  target: "page",
  duration: 1800,
  intensity: 0.3,
  volume: 0.65,
  fade: 350,
  stop: false,
};

export function mediaDefaults(kind: string, sceneId: string, id: string, scene?: Scene): MediaEdit {
  const { blocks = [], events = [] } = scene ?? {};
  const input: MediaEdit = {
    ...structuredClone(emptyMedia),
    kind,
    sceneId,
    id,
    loop: kind === "Background Music",
  };
  const block = blocks.find(
    (block): block is MediaBlock => block.kind === "media" && block.id === id,
  );
  if (block) Object.assign(input, imageDefaults(block));
  if (kind === "Image") imageEffects(input, block, scene);
  const event = events.find((event) => event.id === id);
  if (!event) return input;
  const { segmentId = "", blockId = "page" } = event.trigger;
  const { delayMs = 0 } = event;
  input.segment = segmentId;
  input.delay = delayMs;
  input.target = event.phase === "exit" ? "transition" : (event.blockId ?? blockId);
  const action = event.action;
  if (action.kind === "effect") {
    input.effect = action.effect.id;
    input.duration = action.effect.duration;
    if ("intensity" in action.effect) {
      const { intensity = 0.3 } = action.effect;
      input.intensity = intensity;
    }
  }
  if (action.kind === "audio") {
    const { volume = 0.65, loop = false, fadeMs = 350 } = action;
    Object.assign(input, {
      asset: action.assetId,
      volume,
      loop,
      fade: fadeMs,
    });
  }
  input.stop = action.kind === "stop-audio";
  return input;
}

function imageEffects(input: MediaEdit, block: MediaBlock | undefined, scene?: Scene) {
  // Keep the simple image effect separate from general animation cues.
  // An absent cue means the image is still, including after reopening the editor.
  input.effect = "none";
  const simple = scene?.events?.find((event) => event.id === `${input.id}.simple`);
  if (simple?.action.kind === "effect" && ["fade-in", "fade-out"].includes(simple.action.effect.id))
    input.effect = simple.action.effect.id;
  const hold = scene?.events?.find(
    (event) =>
      event.blockId === input.id &&
      event.blocking &&
      event.action.kind === "effect" &&
      event.action.effect.id === "cinematic-camera",
  );
  if (
    block?.layout === "fullscreen" &&
    input.motion.preset === "none" &&
    !input.motion.durationMs &&
    hold?.action.kind === "effect"
  )
    input.motion = { ...input.motion, durationMs: hold.action.effect.duration };
}
function imageDefaults(block: MediaBlock) {
  const {
    image: asset,
    layout,
    caption = "",
    widthPercent: width = 100,
    align = "center",
    fit = layout === "fullscreen" ? "cover" : "contain",
    motion = CinematicSchema.parse({ preset: "none" }),
    illustration = null,
    durationMs: persistence = 0,
  } = block;
  const { x = 0, y = 0 } = block.position ?? {};
  const { kind = "page", segmentId = "", delayMs = 0 } = block.show ?? {};
  return {
    asset,
    layout,
    examination: block.examination ?? (block.photograph ? undefined : null),
    caption,
    width,
    align,
    fit,
    positionOverride: Boolean(block.position),
    x,
    y,
    motion,
    illustration,
    show: kind,
    segment: segmentId,
    delay: delayMs,
    persistence,
  };
}

export function mediaContext(
  language: StoryProject["languages"][string],
  sceneId: string,
  asset: string,
  selectedId?: string,
) {
  const { blocks = [], events = [] } = language.configuration.scenes?.[sceneId] ?? {};
  const chosen = language.configuration.assets?.find((a) => a.id === asset);
  return {
    segmentIds: [...language.script.matchAll(/#\s*segment:([a-z][a-z0-9.-]*)/g)]
      .map((m) => m[1]!)
      .filter((id) => id.startsWith(`${sceneId}.`)),
    alt: chosen?.alt ?? "",
    assetUrl: chosen ? `/stories/house/${chosen.path}` : undefined,
    blocks: blocks.filter((b) => b.kind === "media").map((b) => b.id),
    trigger: events.find((e) => e.id === selectedId)?.trigger.kind ?? "passage",
  };
}

const emptyExamination = { image: "", title: "Image", descriptions: [""], reverse: "" };
/** An examination as the form edits it: stored values, defaults, and a button label. */
export function examinationDraft(
  initial: ImageExamination | null | undefined,
  locale: string,
): ImageExamination {
  const french = locale.startsWith("fr");
  const label = initial?.actionId
    ? french
      ? "Examiner la photographie"
      : "Examine the photograph"
    : french
      ? "Examiner l’image"
      : "Examine the image";
  return { ...emptyExamination, ...initial, buttonLabel: initial?.buttonLabel ?? label };
}

/** What the Image and Video forms start from: the stored values and the picture's alt text. */
export function imageDraft(
  initial: MediaEdit,
  options: { alt: string; shared: boolean; locale: string; legacy?: ImageExamination | null },
): ImageDraft {
  const examination =
    (initial.examination === undefined ? options.legacy : initial.examination) ?? null;
  return {
    shared: options.shared,
    alt: options.alt,
    caption: initial.caption,
    width: initial.width,
    align: initial.align,
    fit: initial.fit,
    positionOverride: initial.positionOverride,
    x: initial.x,
    y: initial.y,
    show: initial.show,
    segment: initial.segment,
    delay: initial.delay,
    persistence: initial.persistence,
    effect: ["none", "fade-in", "fade-out"].includes(initial.effect) ? initial.effect : "none",
    examination: examination && examinationDraft(examination, options.locale),
  };
}

/**
 * The edit Apply stores for an Image or Video, from the typed form state (it replaces the
 * hidden JSON inputs and FormData reading, with the same result).
 */
export function imageInput(
  initial: MediaEdit,
  form: {
    asset: string;
    layout: MediaEdit["layout"];
    motion: MediaEdit["motion"];
    illustration: MediaEdit["illustration"];
    draft: ImageDraft;
  },
): MediaEdit {
  const image = initial.kind === "Image";
  const layered = Boolean(form.illustration?.layers.length);
  return {
    ...initial,
    ...form.draft,
    asset: form.asset,
    layout: form.layout,
    fit: image ? initial.fit : form.draft.fit,
    // Only an image that isn't a cinematic can be examined.
    examination: image && form.layout !== "fullscreen" ? form.draft.examination : null,
    // A single image has a simple effect and stays still; layers have the camera instead.
    effect: !image ? initial.effect : layered ? "none" : form.draft.effect,
    motion: !image
      ? initial.motion
      : layered
        ? form.motion
        : CinematicSchema.parse({ preset: "none" }),
    illustration: image ? (form.illustration ?? illustrationDefaults()) : initial.illustration,
  };
}
