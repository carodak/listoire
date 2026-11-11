import "fake-indexeddb/auto";
import { it, expect, vi } from "vitest";
import { RuntimeAssetSchema } from "../contracts/presentation.ts";
import { storeUploadedMedia, readUploadedMedia } from "./media-store.ts";
import { splitStoryArchive, decodeUploadedFile } from "../contracts/story-archive.ts";
import { readFileSync } from "node:fs";
it("stores immutable video bytes separately, verifies restored archives and rejects tampered or oversized media", async () => {
  const bytes = new Uint8Array(
    readFileSync(new URL("../../tests/fixtures/editor-video.mp4", import.meta.url)),
  );
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const asset = RuntimeAssetSchema.parse({
    id: `upload.${hash}`,
    path: `media/upload.${hash}.mp4`,
    type: "video",
    alt: "Test",
    upload: {
      digest: hash,
      size: bytes.length,
      mime: "video/mp4",
      rights: "Synthetic fixture",
      durationMs: 1000,
    },
  });
  await storeUploadedMedia(asset, new Blob([bytes], { type: "video/mp4" }));
  expect(new Uint8Array(await (await readUploadedMedia(asset)).arrayBuffer())).toEqual(bytes);
  await expect(
    storeUploadedMedia(asset, new Blob(["tampered"], { type: "video/mp4" })),
  ).rejects.toThrow(/metadata/);
  const tampered = bytes.slice();
  tampered[tampered.length - 1] = tampered[tampered.length - 1]! ^ 1;
  await expect(
    storeUploadedMedia(asset, new Blob([tampered], { type: "video/mp4" })),
  ).rejects.toThrow(/digest/);
  tampered[4] = 0;
  await expect(
    storeUploadedMedia(asset, new Blob([tampered], { type: "video/mp4" })),
  ).rejects.toThrow(/container/);
  expect(
    RuntimeAssetSchema.safeParse({ ...asset, upload: { ...asset.upload, size: 50_000_001 } })
      .success,
  ).toBe(false);
  const original = JSON.parse(
    readFileSync(new URL("../../docs/story-editor/original-project.json", import.meta.url), "utf8"),
  );
  const data = "data:video/mp4;base64," + Buffer.from(bytes).toString("base64");
  const archive = splitStoryArchive({ ...original, uploadedFiles: { [asset.id]: data } });
  expect(archive.project).toEqual(original);
  expect(
    new Uint8Array(await decodeUploadedFile(asset, archive.uploadedFiles[asset.id]!).arrayBuffer()),
  ).toEqual(bytes);
  expect(() => decodeUploadedFile(asset, "https://example.org/video.mp4")).toThrow(/Invalid/);
});
it("fetches a missing upload from its story, under the deployed base path (REVIEW #6)", async () => {
  const bytes = new TextEncoder().encode("not stored in this browser");
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const asset = RuntimeAssetSchema.parse({
    id: `upload.${digest}`,
    path: `media/upload.${digest}.webp`,
    type: "image",
    alt: "Test",
    upload: { digest, size: bytes.length, mime: "image/webp", rights: "Synthetic fixture" },
  });
  const fetch = vi.fn(async (_url: string | URL) => new Response(null, { status: 404 }));
  vi.stubGlobal("fetch", fetch);
  vi.stubEnv("BASE_URL", "/books/");
  try {
    await expect(readUploadedMedia(asset, "tale")).rejects.toThrow(/Missing uploaded media/);
    expect(String(fetch.mock.calls[0]![0])).toBe(`/books/stories/tale/media/upload.${digest}.webp`);
  } finally {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
});
