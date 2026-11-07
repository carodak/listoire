import type { StoryBundle } from "./story.ts";

export function storyAssetIds(bundle: StoryBundle) {
  const ids = new Set<string>();
  const keys = new Set(["image", "assetId", "portrait", "sound"]);
  function visit(value: unknown, key = "") {
    if (typeof value === "string" && keys.has(key)) ids.add(value);
    else if (Array.isArray(value)) {
      for (const item of value) {
        if (key === "layers" && typeof item === "string") ids.add(item);
        else visit(item);
      }
    } else if (value && typeof value === "object") {
      for (const [name, item] of Object.entries(value)) visit(item, name);
    }
  }
  if (bundle.cover) ids.add(bundle.cover);
  for (const value of [bundle.scenes, bundle.examination, bundle.character, bundle.narration])
    visit(value);
  ids.delete("");
  return ids;
}
