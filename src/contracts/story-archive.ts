import { z } from "zod";
import { StoryProjectSchema } from "./editor-project.ts";
import type { MediaAsset } from "./uploaded-media.ts";
export function splitStoryArchive(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Invalid project backup.");
  const { uploadedFiles, ...project } = raw as Record<string, unknown>;
  return {
    project: StoryProjectSchema.parse(project),
    uploadedFiles: z.record(z.string(), z.string().max(67_000_100)).parse(uploadedFiles ?? {}),
  };
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
