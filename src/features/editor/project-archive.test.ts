import "fake-indexeddb/auto";
import { afterEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { StoryProjectSchema } from "../../contracts/editor-project.ts";
import { sha256 } from "../../contracts/digest.ts";
import { storeUploadedMedia } from "../../persistence/media-store.ts";
import { exportProjectArchive, importProjectArchive } from "./project-archive.ts";

afterEach(() => vi.unstubAllGlobals());

it("exports uploads one at a time and restores them from the backup (REVIEW #15)", async () => {
  let reading = 0;
  let most = 0;
  // Node has no FileReader; this one answers on a later task, like the browser's.
  vi.stubGlobal(
    "FileReader",
    class {
      result = "";
      onload = () => {};
      readAsDataURL(blob: Blob) {
        most = Math.max(most, ++reading);
        void blob.arrayBuffer().then((bytes) => {
          this.result = `data:${blob.type};base64,${Buffer.from(bytes).toString("base64")}`;
          reading--;
          this.onload();
        });
      }
    },
  );
  const video = new Uint8Array(
    readFileSync(new URL("../../../tests/fixtures/editor-video.mp4", import.meta.url)),
  );
  const project = StoryProjectSchema.parse(
    JSON.parse(
      readFileSync(
        new URL("../../../docs/story-editor/original-project.json", import.meta.url),
        "utf8",
      ),
    ),
  );
  const assets = await Promise.all(
    [video, video.slice()].map(async (bytes, index) => {
      // Two different files: the second gets trailing padding, which MP4 readers ignore.
      const padded = index ? new Uint8Array([...bytes, 0, 0, 0, 8, 102, 114, 101, 101]) : bytes;
      const digest = await sha256(padded);
      const asset = {
        id: `upload.${digest}`,
        path: `media/upload.${digest}.mp4`,
        type: "video" as const,
        alt: "Test",
        upload: {
          digest,
          size: padded.length,
          mime: "video/mp4" as const,
          rights: "Synthetic fixture",
          durationMs: 1000,
        },
      };
      await storeUploadedMedia(asset, new Blob([padded], { type: "video/mp4" }));
      return asset;
    }),
  );
  const language = Object.values(project.languages)[0]!;
  language.configuration.assets = [...(language.configuration.assets ?? []), ...assets];
  const archive = JSON.parse(await exportProjectArchive(project));
  expect(Object.keys(archive.uploadedFiles)).toEqual(assets.map((asset) => asset.id));
  expect(most).toBe(1);
  expect(await importProjectArchive(archive)).toEqual(StoryProjectSchema.parse(project));
});
