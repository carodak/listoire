import type { StoryProject } from "../../contracts/editor-project.ts";
import { SceneSchema } from "../../contracts/presentation.ts";
import type { MediaEdit } from "./media-edit.ts";
import { copyMediaResources } from "./media-resources.ts";
import { imageScene, cueScene } from "./media-scene.ts";

export function applyMediaEdit(
  project: StoryProject,
  locale: string,
  input: MediaEdit,
  segmentIds: string[],
  trigger: string,
) {
  const next = structuredClone(project);
  const locales = input.shared ? Object.keys(next.languages) : [locale];
  for (const languageId of locales) {
    const language = next.languages[languageId]!;
    const sourceAsset = copyMediaResources(
      language,
      next.languages[locale]!,
      input,
      languageId === locale,
    );
    const scene = language.configuration.scenes?.[input.sceneId] ?? {
      title: input.sceneId,
      progress: 0,
    };
    const result = ["Image", "Video", "3D Scene"].includes(input.kind)
      ? imageScene(
          scene,
          input,
          segmentIds,
          Boolean(sourceAsset?.scene3d && input.kind === "3D Scene"),
          sourceAsset?.type === "video",
        )
      : cueScene(scene, input, trigger);
    language.configuration.scenes = {
      ...language.configuration.scenes,
      [input.sceneId]: SceneSchema.parse(result),
    };
  }
  return next;
}
