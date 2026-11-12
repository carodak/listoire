import { z } from "zod";
import { StoryProjectSchema } from "./editor-project.ts";
import type { MediaAsset } from "./presentation.ts";
export function splitStoryArchive(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Invalid project backup.");
  const { uploadedFiles, ...project } = raw as Record<string, unknown>;
  return {
    project: StoryProjectSchema.parse(project),
    uploadedFiles: z.record(z.string(), z.string().max(67_000_100)).parse(uploadedFiles ?? {}),
  };
}
/** A file as a base64 data URL: what a backup stores, and decodeUploadedFile reads back. */
export function encodeDataUrl(blob: Blob, failure: string) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(failure));
    reader.readAsDataURL(blob);
  });
}
export function decodeUploadedFile(asset: MediaAsset, data: string) {
  const prefix = `data:${asset.upload?.mime};base64,`;
  if (
    !asset.upload ||
    !data.startsWith(prefix) ||
    data.length > 67_000_100 ||
    !/^[A-Za-z0-9+/]+=*$/.test(data.slice(prefix.length))
  )
    throw new Error("Invalid video backup bytes.");
  const decoded = atob(data.slice(prefix.length));
  return new Blob([Uint8Array.from(decoded, (character) => character.charCodeAt(0))], {
    type: asset.upload.mime,
  });
}
