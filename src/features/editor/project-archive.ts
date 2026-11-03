import { splitStoryArchive, decodeUploadedFile } from "../../contracts/story-archive.ts";
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
  const files = await Promise.all(
    uploads(project).map(async (asset) => [
      asset.id,
      await new Promise<string>((resolve, reject) => {
        void readUploadedMedia(asset)
          .then((blob) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("Could not export video."));
            reader.readAsDataURL(blob);
          })
          .catch(reject);
      }),
    ]),
  );
  return JSON.stringify(
    files.length ? { ...project, uploadedFiles: Object.fromEntries(files) } : project,
    null,
    2,
  );
}
export async function importProjectArchive(raw: unknown) {
  const { project, uploadedFiles } = splitStoryArchive(raw);
  for (const asset of uploads(project)) {
    const data = uploadedFiles[asset.id];
    if (!data) throw new Error(`Backup is missing video ${asset.id}.`);
    await storeUploadedMedia(asset, decodeUploadedFile(asset, data));
  }
  return project;
}
