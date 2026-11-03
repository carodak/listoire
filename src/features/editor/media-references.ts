import type { StoryProject } from "../../contracts/editor-project.ts";
type Language = StoryProject["languages"][string];
const reference = /^\s*\/\/ @media ([a-z0-9.-]+)\/([a-z0-9.-]+)/;
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
export function editMediaScript(language: Language, script: string): Language {
  const removed = language.script
    .split("\n")
    .map((line) => line.match(reference))
    .filter((match) => match && mediaReferenceLine(script, match[1]!, match[2]!) < 0);
  if (!removed.length) return { ...language, script };
  const next = structuredClone(language);
  next.script = script;
  for (const match of removed) {
    const scene = next.configuration.scenes?.[match![1]!];
    if (!scene) continue;
    const id = match![2]!;
    const block = scene.blocks?.find((b) => b.kind === "media" && b.id === id);
    scene.blocks = scene.blocks?.filter((b) => b.kind !== "media" || b.id !== id);
    scene.events = scene.events?.filter((e) => e.id !== id && e.blockId !== id);
    if (block?.kind === "media" && scene.image === block.image) delete scene.image;
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

type Scene = NonNullable<Language["configuration"]["scenes"]>[string];
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
  const knot = rows.findIndex(
    (line) =>
      line
        .match(/^\s*={2,}\s*(\w+)/)?.[1]
        ?.toLowerCase()
        .replace(/_/g, "-") === sceneId,
  );
  return knot < 0 ? rows.length : knot + 1;
}
export function sceneMediaEntries(language: Language, sceneId: string) {
  const scene = language.configuration.scenes?.[sceneId];
  return [
    ...(scene?.blocks ?? [])
      .filter((block) => block.kind === "media")
      .map((block) => ({
        id: block.id,
        kind:
          language.configuration.assets?.find((asset) => asset.id === block.image)?.type === "video"
            ? "Video"
            : "Image",
        label: block.image,
      })),
    ...(scene?.events ?? [])
      .filter(
        (event) =>
          !event.id.endsWith(".motion") &&
          !(event.action.kind === "effect" && event.action.effect.id === "video-playback"),
      )
      .map((event) => ({
        id: event.id,
        kind:
          event.action.kind === "effect"
            ? "Animation"
            : event.action.channel === "music"
              ? "Background Music"
              : "Sound Effect",
        label:
          event.action.kind === "effect"
            ? event.action.effect.id
            : event.action.kind === "audio"
              ? event.action.assetId
              : "Stop audio",
      })),
  ];
}
