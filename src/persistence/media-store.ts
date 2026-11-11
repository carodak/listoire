import { storyFileUrl } from "../contracts/app-path.ts";
import { createStore, get, set } from "idb-keyval";
import { sameOriginFetch } from "../contracts/same-origin-fetch.ts";
import { verifyUploadedMedia } from "../contracts/uploaded-media.ts";
import type { MediaAsset } from "../contracts/presentation.ts";
const store = createStore("listoire-media", "files");
interface MediaBytes {
  bytes: ArrayBuffer;
  mime: string;
}
export async function storeUploadedMedia(asset: MediaAsset, blob: Blob) {
  await verifyUploadedMedia(asset, blob);
  // WebKit on Windows rejects IndexedDB Blob writes; immutable bytes work across browsers.
  await set(
    asset.id,
    { bytes: await blob.arrayBuffer(), mime: blob.type } satisfies MediaBytes,
    store,
  );
}
export async function readUploadedMedia(asset: MediaAsset, storyId = "house"): Promise<Blob> {
  const cached = await get<Blob | MediaBytes>(asset.id, store);
  let blob =
    cached instanceof Blob
      ? cached
      : cached?.bytes instanceof ArrayBuffer
        ? new Blob([cached.bytes], { type: cached.mime })
        : undefined;
  if (!(blob instanceof Blob)) {
    const response = await sameOriginFetch(storyFileUrl(storyId, asset.path), {
      timeoutMs: 15000,
      maxBytes: 50_000_000,
    });
    if (!response.ok)
      throw new Error(`Missing uploaded media: ${asset.id}. Restore its complete project backup.`);
    blob = new Blob([await response.arrayBuffer()], { type: asset.upload!.mime });
  }
  return verifyUploadedMedia(asset, blob);
}
export async function resolveMediaAsset(asset: MediaAsset, storyId: string) {
  if (!asset.upload) return { url: storyFileUrl(storyId, asset.path), dispose() {} };
  const url = URL.createObjectURL(await readUploadedMedia(asset, storyId));
  return { url, dispose: () => URL.revokeObjectURL(url) };
}
