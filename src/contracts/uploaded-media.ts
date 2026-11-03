import { sha256 } from "./digest.ts";
import type { z } from "zod";
import type { RuntimeAssetSchema } from "./presentation.ts";
export type MediaAsset = z.infer<typeof RuntimeAssetSchema>;
export async function verifyUploadedMedia(asset: MediaAsset, blob: Blob) {
  if (
    !asset.upload ||
    blob.size !== asset.upload.size ||
    blob.size > 50_000_000 ||
    blob.type !== asset.upload.mime
  )
    throw new Error("Uploaded video metadata does not match its file.");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const header =
    asset.upload.mime === "video/mp4"
      ? String.fromCharCode(...bytes.slice(4, 8)) === "ftyp"
      : [0x1a, 0x45, 0xdf, 0xa3].every((byte, index) => bytes[index] === byte);
  if (!header) throw new Error("The file is not a recognized MP4 or WebM container.");
  const hex = await sha256(bytes);
  if (hex !== asset.upload.digest) throw new Error("Uploaded video digest does not match.");
  return blob;
}
