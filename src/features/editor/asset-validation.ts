import type { StoryBundle } from "../../contracts/story.ts";
import { readUploadedMedia } from "../../persistence/media-store.ts";
const checked = new Map<string, Promise<void>>();
export async function verifyMediaAssets(bundles: Record<string, StoryBundle>) {
  for (const bundle of Object.values(bundles))
    for (const asset of bundle.assets ?? []) if (asset.upload) await readUploadedMedia(asset);
  const paths = new Set(
    Object.values(bundles).flatMap((bundle) =>
      (bundle.assets ?? [])
        .filter((asset) => !asset.upload && !bundle.embeddedAudio?.[asset.id])
        .map((asset) => `/stories/${bundle.storyId}/${asset.path}`),
    ),
  );
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
