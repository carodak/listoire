import { sceneMediaEntries } from "./scene-media.ts";
import { outlineEntries } from "./ink-outline.ts";
import type { StoryProject } from "../../contracts/editor-project.ts";
type Language = StoryProject["languages"][string];
const reference = /^\s*\/\/ @media ([a-z0-9.-]+)\/([a-z0-9.-]+)/;
type Scene = NonNullable<Language["configuration"]["scenes"]>[string];
type Block = NonNullable<Scene["blocks"]>[number];
/** A media item whose `// @media` line was cut, kept aside until the line comes back. */
export interface KeptMedia {
  block?: Block;
  index: number;
  /** Its cues, each with its place in the scene's list. */
  events: { event: NonNullable<Scene["events"]>[number]; index: number }[];
  sceneImage: boolean;
}
const references = (script: string) =>
  script
    .split("\n")
    .map((line) => line.match(reference))
    .filter((match) => match !== null);
const present = (scene: Scene | undefined, id: string) =>
  Boolean(
    scene?.blocks?.some((b) => b.kind === "media" && b.id === id) ||
    scene?.events?.some((e) => e.id === id || e.blockId === id),
  );

/**
 * Follows the script's `// @media` lines: a removed line removes its media; the same line pasted
 * (or typed) back restores it from `kept`, the editor session's cut buffer (REVIEW #3).
 */
export function editMediaScript(
  language: Language,
  script: string,
  kept = new Map<string, KeptMedia>(),
): Language {
  const removed = references(language.script).filter(
    (match) => mediaReferenceLine(script, match[1]!, match[2]!) < 0,
  );
  const returning = references(script).filter(
    (match) =>
      kept.has(`${match[1]}/${match[2]}`) &&
      !present(language.configuration.scenes?.[match[1]!], match[2]!),
  );
  if (!removed.length && !returning.length) return { ...language, script };
  const next = structuredClone(language);
  next.script = script;
  for (const match of removed) {
    const scene = next.configuration.scenes?.[match[1]!];
    if (scene) kept.set(`${match[1]}/${match[2]}`, takeMedia(scene, match[2]!));
  }
  for (const match of returning) {
    const key = `${match[1]}/${match[2]}`;
    const scene = next.configuration.scenes?.[match[1]!];
    if (scene) restoreMedia(scene, kept.get(key)!, precedingSegment(script, match[0]));
    kept.delete(key);
  }
  const active = new Set(
    Object.entries(next.configuration.scenes ?? {}).flatMap(([sceneId, scene]) => [
      ...(scene.blocks ?? []).filter((b) => b.kind === "media").map((b) => `${sceneId}/${b.id}`),
      ...(scene.events ?? []).map((e) => `${sceneId}/${e.id}`),
    ]),
  );
  next.script = next.script
    .split("\n")
    .filter((line) => {
      const match = line.match(reference);
      return !match || active.has(`${match[1]}/${match[2]}`);
    })
    .join("\n");
  return next;
}

function takeMedia(scene: Scene, id: string): KeptMedia {
  const index = scene.blocks?.findIndex((b) => b.kind === "media" && b.id === id) ?? -1;
  const block = scene.blocks?.[index];
  const sceneImage = block?.kind === "media" && scene.image === block.image;
  scene.blocks = scene.blocks?.filter((b) => b.kind !== "media" || b.id !== id);
  const events = (scene.events ?? []).flatMap((event, index) =>
    event.id === id || event.blockId === id ? [{ event, index }] : [],
  );
  scene.events = scene.events?.filter((e) => e.id !== id && e.blockId !== id);
  if (sceneImage) delete scene.image;
  return { block, index, events, sceneImage };
}

/** Puts kept media back: after the text the line now follows, or where it was. */
function restoreMedia(scene: Scene, media: KeptMedia, segmentId?: string) {
  if (media.block) {
    const blocks = (scene.blocks ??= []);
    const after = blocks.findIndex((b) => b.kind === "text" && b.segmentId === segmentId);
    const at = after >= 0 ? after + 1 : Math.min(Math.max(media.index, 0), blocks.length);
    blocks.splice(at, 0, media.block);
    if (media.sceneImage && media.block.kind === "media") scene.image = media.block.image;
  }
  if (!media.events.length) return;
  const events = (scene.events ??= []);
  for (const { event, index } of media.events) events.splice(index, 0, event);
}

/** The `# segment:` of the nearest text line above `line`, within its knot. */
function precedingSegment(script: string, line: string) {
  const rows = script.split("\n");
  for (let row = rows.findIndex((text) => text.startsWith(line)) - 1; row >= 0; row--) {
    if (/^\s*={2,}/.test(rows[row]!)) return;
    const segment = rows[row]!.match(/#\s*segment:([a-z][a-z0-9.-]*)/)?.[1];
    if (segment) return segment;
  }
}

export function mediaInsertionPosition(
  script: string,
  sceneId: string,
  end: { row: number; column: number },
) {
  const rows = script.split("\n");
  const knots = outlineEntries(script).filter((entry) => entry.kind === "Knot");
  const current = knots.filter((entry) => entry.row <= end.row).at(-1);
  const target = knots.find((entry) => entry.knot === sceneId);
  let row = end.row;
  if (target && current?.knot !== sceneId) {
    row = target.row;
    while (rows[row + 1] !== undefined && /^\s*(?:\/\/.*)?$/.test(rows[row + 1]!)) row++;
  }
  return { row, column: (rows[row] ?? "").length };
}
export function mediaReferenceLine(script: string, scene: string, id: string) {
  return script.split("\n").findIndex((line) => {
    const match = line.match(reference);
    return match?.[1] === scene && match[2] === id;
  });
}
export function withMediaReferences(project: StoryProject): StoryProject {
  const languages = Object.fromEntries(
    Object.entries(project.languages).map(([locale, language]) => [
      locale,
      { ...language, script: annotateMedia(language) },
    ]),
  );
  return { ...project, languages };
}
function annotateMedia(language: Language) {
  let script = language.script;
  for (const [sceneId, scene] of Object.entries(language.configuration.scenes ?? {})) {
    const entries = sceneMediaEntries(language, sceneId);
    const missing = entries.filter((entry) => mediaReferenceLine(script, sceneId, entry.id) < 0);
    if (!missing.length) continue;
    const rows = script.split("\n");
    for (const entry of missing)
      rows.splice(
        referenceRow(rows, sceneId, scene, entry.id),
        0,
        `// @media ${sceneId}/${entry.id} - ${entry.kind}: ${entry.label}`,
      );
    script = rows.join("\n");
  }
  return script;
}

function referenceRow(rows: string[], sceneId: string, scene: Scene, id: string) {
  const index = scene.blocks?.findIndex((block) => block.kind === "media" && block.id === id) ?? -1;
  const previous = scene.blocks
    ?.slice(0, index)
    .filter((block) => block.kind === "text")
    .at(-1);
  const segmentRow =
    previous?.kind === "text"
      ? rows.findIndex((line) => line.includes(`# segment:${previous.segmentId}`))
      : -1;
  if (segmentRow >= 0) return segmentRow + 1;
  const knot =
    outlineEntries(rows.join("\n")).find((entry) => entry.kind === "Knot" && entry.knot === sceneId)
      ?.row ?? -1;
  return knot < 0 ? rows.length : knot + 1;
}
