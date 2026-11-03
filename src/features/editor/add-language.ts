import type { StoryProject } from "../../contracts/editor-project.ts";
import { StoryProjectSchema } from "../../contracts/editor-project.ts";
export function addLanguage(project: StoryProject, source: string, locale: string) {
  if (project.languages[locale]) throw new Error("This language already exists.");
  const language = structuredClone(project.languages[source]!);
  const localizedAudio = new Set(language.configuration.narration?.map((clip) => clip.assetId));
  language.configuration.assets = language.configuration.assets?.filter(
    (asset) => !localizedAudio.has(asset.id),
  );
  language.configuration.narration = [];
  language.configuration.embeddedAudio = {};
  language.configuration.narratorVoices = [];
  language.configuration.narratorVoiceSelection = [];
  language.defaults = { ...language.defaults, narratorVoice: undefined, narration: false };
  language.missingTranslation = true;
  return StoryProjectSchema.parse({
    ...project,
    languages: { ...project.languages, [locale]: language },
  });
}
