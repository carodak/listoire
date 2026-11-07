import type { StoryProject } from "../../contracts/editor-project.ts";
import type { MediaEdit } from "./media-edit.ts";
type Language = StoryProject["languages"][string];

export function copyMediaResources(
  language: Language,
  source: Language,
  input: MediaEdit,
  sameLanguage: boolean,
) {
  const sourceAsset = source.configuration.assets?.find((asset) => asset.id === input.asset);
  const dependencies = new Set([
    input.asset,
    ...(input.illustration?.layers.map((layer) => layer.image) ?? []),
    ...input.motion.layers,
    ...(sourceAsset?.scene3d?.elements.map((element) => element.assetId) ?? []),
  ]);
  const existing = language.configuration.assets ?? [];
  const sources = (source.configuration.assets ?? [])
    .filter((asset) => dependencies.has(asset.id))
    .map((asset) => {
      const translated = sameLanguage ? undefined : existing.find((entry) => entry.id === asset.id);
      const alt =
        sameLanguage && asset.id === input.asset && input.alt
          ? input.alt
          : (translated?.alt ?? asset.alt);
      return { ...asset, alt };
    });
  language.configuration.assets = [
    ...existing.filter((asset) => !dependencies.has(asset.id)),
    ...sources,
  ];
  for (const id of dependencies) {
    const audio = source.configuration.embeddedAudio?.[id];
    if (audio)
      language.configuration.embeddedAudio = {
        ...language.configuration.embeddedAudio,
        [id]: audio,
      };
  }
  return sourceAsset;
}
