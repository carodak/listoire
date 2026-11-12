import {
  splitStoryArchive,
  decodeUploadedFile,
  encodeDataUrl,
} from "../../contracts/story-archive.ts";
import type { StoryProject } from "../../contracts/editor-project.ts";
import { readUploadedMedia, storeUploadedMedia } from "../../persistence/media-store.ts";
function uploads(project: StoryProject) {
  return [
    ...new Map(
      Object.values(project.languages).flatMap(
        (language) =>
          language.configuration.assets
            ?.filter((asset) => asset.upload)
            .map((asset) => [asset.id, asset] as const) ?? [],
      ),
    ).values(),
  ];
}
export async function exportProjectArchive(project: StoryProject) {
  // One file at a time: only its bytes and its text are in memory together, not every upload.
  const uploadedFiles: Record<string, string> = {};
  for (const asset of uploads(project))
    uploadedFiles[asset.id] = await encodeDataUrl(
      await readUploadedMedia(asset),
      "Could not export media.",
    );
  return JSON.stringify(
    Object.keys(uploadedFiles).length ? { ...project, uploadedFiles } : project,
    null,
    2,
  );
}
export async function importProjectArchive(raw: unknown) {
  const { project, uploadedFiles } = splitStoryArchive(raw);
  for (const asset of uploads(project)) {
    const data = uploadedFiles[asset.id];
    if (!data) throw new Error(`Backup is missing media ${asset.id}.`);
    await storeUploadedMedia(asset, decodeUploadedFile(asset, data));
  }
  return project;
}
