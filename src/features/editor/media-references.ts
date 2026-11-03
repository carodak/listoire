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
    const entries = [
      ...(scene.blocks ?? [])
        .filter((b) => b.kind === "media")
        .map((b) => ({ id: b.id, label: `Image: ${b.image}` })),
      ...(scene.events ?? []).map((e) => ({
        id: e.id,
        label:
          e.action.kind === "effect"
            ? `Animation: ${e.action.effect.id}`
            : e.action.kind === "audio"
              ? `Audio: ${e.action.assetId}`
              : "Stop audio",
      })),
    ];
    const missing = entries.filter((entry) => mediaReferenceLine(script, sceneId, entry.id) < 0);
    if (!missing.length) continue;
    const rows = script.split("\n");
    const row = rows.findIndex(
      (line) =>
        line
          .match(/^\s*={2,}\s*(\w+)/)?.[1]
          ?.toLowerCase()
          .replace(/_/g, "-") === sceneId,
    );
    const notes = missing.map((entry) => `// @media ${sceneId}/${entry.id} — ${entry.label}`);
    rows.splice(row < 0 ? rows.length : row + 1, 0, ...notes);
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
