import { readUploadedMedia } from "../../persistence/media-store.ts";
import { storyAssetIds } from "../../contracts/story-assets.ts";
import type { StoryBundle } from "../../contracts/story.ts";

const checked = new Map<string, Promise<void>>();
export async function verifyMediaAssets(bundles: Record<string, StoryBundle>) {
  const paths = new Set<string>();
  for (const bundle of Object.values(bundles)) {
    const ids = storyAssetIds(bundle);
    for (const asset of bundle.assets ?? []) {
      if (!ids.has(asset.id)) continue;
      if (asset.upload) await readUploadedMedia(asset);
      else if (!bundle.embeddedAudio?.[asset.id])
        paths.add(`/stories/${bundle.storyId}/${asset.path}`);
    }
  }
  await Promise.all(
    [...paths].map((path) => {
      let request = checked.get(path);
      if (!request) {
        request = fetch(path, {
          method: "HEAD",
          redirect: "error",
          credentials: "same-origin",
          signal: AbortSignal.timeout(5000),
        })
          .then((response) => {
            if (!response.ok) throw new Error(`Missing media asset: ${path}`);
          })
          .catch((error) => {
            checked.delete(path);
            throw error;
          });
        checked.set(path, request);
      }
      return request;
    }),
  );
}
