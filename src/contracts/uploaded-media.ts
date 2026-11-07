import { sha256 } from "./digest.ts";
import type { z } from "zod";
import type { RuntimeAssetSchema } from "./presentation.ts";
import { inspectGlb } from "./scene3d.ts";
export type MediaAsset = z.infer<typeof RuntimeAssetSchema>;
export async function verifyUploadedMedia(asset: MediaAsset, blob: Blob) {
  if (
    !asset.upload ||
    blob.size !== asset.upload.size ||
    blob.size > 50_000_000 ||
    blob.type !== asset.upload.mime
  )
    throw new Error("Uploaded media metadata does not match its file.");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (asset.upload.mime === "model/gltf-binary") inspectGlb(bytes);
  const header =
    asset.upload.mime === "model/gltf-binary" ||
    (asset.upload.mime === "image/webp"
      ? String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
        String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
      : asset.upload.mime === "video/mp4"
        ? String.fromCharCode(...bytes.slice(4, 8)) === "ftyp"
        : [0x1a, 0x45, 0xdf, 0xa3].every((byte, index) => bytes[index] === byte));
  if (!header) throw new Error("The file container does not match its declared media format.");
  const hex = await sha256(bytes);
  if (hex !== asset.upload.digest) throw new Error("Uploaded media digest does not match.");
  return blob;
}
