import { createStore, get, set } from "idb-keyval";
import { verifyUploadedMedia } from "../contracts/uploaded-media.ts";
import type { MediaAsset } from "../contracts/uploaded-media.ts";
const store = () => createStore("listoire-media", "files");
export async function storeUploadedMedia(asset: MediaAsset, blob: Blob) {
  await verifyUploadedMedia(asset, blob);
  // WebKit on Windows rejects IndexedDB Blob writes; immutable bytes work across browsers.
  await set(asset.id, { bytes: await blob.arrayBuffer(), mime: blob.type }, store());
}
export async function readUploadedMedia(asset: MediaAsset): Promise<Blob> {
  const cached = await get<Blob | { bytes: ArrayBuffer; mime: string }>(asset.id, store());
  let blob =
    cached instanceof Blob
      ? cached
      : cached?.bytes instanceof ArrayBuffer
        ? new Blob([cached.bytes], { type: cached.mime })
        : undefined;
  if (!(blob instanceof Blob)) {
    const response = await fetch(`/stories/house/${asset.path}`, {
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    if (
      !response.ok ||
      !response.headers.get("content-type")?.startsWith("video/") ||
      Number(response.headers.get("content-length")) > 50_000_000
    )
      throw new Error(`Missing uploaded video: ${asset.id}. Restore its complete project backup.`);
    blob = await response.blob();
  }
  return verifyUploadedMedia(asset, blob);
}
export async function resolveMediaAsset(asset: MediaAsset, storyId: string) {
  if (!asset.upload)
    return { url: `${import.meta.env.BASE_URL}stories/${storyId}/${asset.path}`, dispose() {} };
  const url = URL.createObjectURL(await readUploadedMedia(asset));
  return { url, dispose: () => URL.revokeObjectURL(url) };
}
