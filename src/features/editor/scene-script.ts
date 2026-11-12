import { passageSlug } from "../../contracts/story.ts";
import type { StoryProject } from "../../contracts/editor-project.ts";
import { knotNames } from "./ink-outline.ts";

type Scenes = NonNullable<StoryProject["languages"][string]["configuration"]["scenes"]>;
type Narration = NonNullable<StoryProject["languages"][string]["configuration"]["narration"]>;

export function declaredPassages(script: string) {
  script = script
    .replace(/\/\*[\s\S]*?(?:\*\/|$)/g, (comment) => comment.replace(/[^\r\n]/g, " "))
    .replace(/\/\/[^\n]*/g, "");
  const passages: Record<string, string[]> = {};
  let passage = "start";
  for (const line of script.split("\n")) {
    const tag = line.match(/#\s*passage:([a-z][a-z0-9.-]*)/);
    if (tag) {
      passage = tag[1]!;
      passages[passage] ??= [];
    }
    const segment = line.match(/#\s*segment:([a-z][a-z0-9.-]*)/);
    if (segment) (passages[passage] ??= []).push(segment[1]!);
  }
  for (const name of knotNames(script)) passages[passageSlug(name)] ??= ["text"];
  if (!Object.keys(passages).length) passages.start = ["text"];
  return passages;
}

/** Keep removed scene settings in the session so temporarily cut headers can return. */
export function synchronizeScenes(
  project: StoryProject,
  kept = new Map<string, { scenes: Scenes; narration: Narration }>(),
) {
  return {
    ...project,
    languages: Object.fromEntries(
      Object.entries(project.languages).map(([locale, language]) => {
        const passages = declaredPassages(language.script);
        const removed = kept.get(locale) ?? { scenes: {}, narration: [] };
        const scenes: Scenes = { ...language.configuration.scenes };
        for (const [id, scene] of Object.entries(scenes)) {
          if (!Object.hasOwn(passages, id)) {
            removed.scenes[id] = scene;
            delete scenes[id];
          }
        }
        for (const [id, scene] of Object.entries(removed.scenes)) {
          if (Object.hasOwn(passages, id)) {
            scenes[id] ??= scene;
            delete removed.scenes[id];
          }
        }
        kept.set(locale, removed);
        const segments = new Set(Object.values(passages).flat());
        const current = language.configuration.narration;
        const clips = [
          ...(current ?? []),
          ...removed.narration.filter(
            (clip) => !current?.some((other) => other.segmentId === clip.segmentId),
          ),
        ];
        removed.narration = clips.filter((clip) => !segments.has(clip.segmentId));
        const narration = current
          ? clips.filter((clip) => segments.has(clip.segmentId))
          : undefined;
        const script = language.script
          .split("\n")
          .filter((line) => {
            const reference = line.match(/^\s*\/\/ @media ([a-z0-9.-]+)\//);
            return !reference || Object.hasOwn(passages, reference[1]!);
          })
          .join("\n");
        return [
          locale,
          { ...language, script, configuration: { ...language.configuration, scenes, narration } },
        ];
      }),
    ),
  };
}
