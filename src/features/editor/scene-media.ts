import type { StoryProject } from "../../contracts/editor-project.ts";
import type { NarrativeEvent } from "../../contracts/narrative-events.ts";
import { isMediaBlock } from "../../contracts/presentation.ts";
type Language = StoryProject["languages"][string];
export function sceneMediaEntries(language: Language, sceneId: string) {
  const { blocks = [], events = [] } = language.configuration.scenes?.[sceneId] ?? {};
  return [
    ...blocks.filter(isMediaBlock).map((block) => ({
      id: block.id,
      kind:
        language.configuration.assets?.find((asset) => asset.id === block.image)?.type === "video"
          ? "Video"
          : "Image",
      label: block.image,
    })),
    ...events.flatMap(eventEntry),
  ];
}

function eventEntry({ id, action }: NarrativeEvent) {
  if (id.endsWith(".motion")) return [];
  if (action.kind === "effect") {
    if (action.effect.id === "video-playback") return [];
    return [{ id, kind: "Animation", label: action.effect.id }];
  }
  const channels = { music: "Background Music", sfx: "Sound Effect", ambience: "Sound Effect" };
  return [
    {
      id,
      kind: channels[action.channel],
      label: action.kind === "audio" ? action.assetId : "Stop audio",
    },
  ];
}
