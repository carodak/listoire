import { afterEach, beforeEach, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { createServer } from "vite";
import type { ViteDevServer } from "vite";
import { editorLibrary } from "../../../tools/editor-library.ts";

let directory: string;
let server: ViteDevServer;
let base: string;
beforeEach(async () => {
  directory = await mkdtemp(resolve(".fallow/library-test-"));
  await mkdir(resolve(directory, "assets/catalog"), { recursive: true });
  await mkdir(resolve(directory, ".fallow/library-cache"), { recursive: true });
  await writeFile(resolve(directory, ".fallow/library-cache/test.webp"), "0123456789");
  await writeFile(resolve(directory, "private.txt"), "private");
  const asset = {
    optimizedPath: ".fallow/library-cache/test.webp",
    runtimePath: "media/test.webp",
    mediaType: "image",
    rights: { officialStoryUse: "allowed" },
  };
  await writeFile(
    resolve(directory, "assets/catalog/curated.json"),
    JSON.stringify({
      entries: [
        asset,
        { ...asset, runtimePath: "media/private.webp", optimizedPath: "private.txt" },
        { ...asset, runtimePath: "media/unlicensed.webp", rights: { officialStoryUse: "denied" } },
        {
          ...asset,
          runtimePath: "media/missing.webp",
          optimizedPath: ".fallow/library-cache/missing.webp",
        },
      ],
    }),
  );
  server = await createServer({
    configFile: false,
    root: directory,
    plugins: [editorLibrary],
    server: { host: "127.0.0.1", port: 0 },
  });
  await server.listen();
  base = server.resolvedUrls!.local[0]!;
});
afterEach(async () => {
  await server?.close();
  if (!directory.startsWith(resolve(".fallow") + sep))
    throw new Error("Unexpected library test directory");
  await rm(directory, { recursive: true, force: true });
});
it("serves licensed ranges and HEAD requests without exposing private or unlicensed files", async () => {
  const path = base + "stories/house/media/test.webp";
  expect(await (await fetch(path)).text()).toBe("0123456789");
  const range = await fetch(path + "?preview=1", { headers: { Range: "bytes=2-4" } });
  expect(range.status).toBe(206);
  expect(range.headers.get("content-range")).toBe("bytes 2-4/10");
  expect(await range.text()).toBe("234");
  const head = await fetch(path, { method: "HEAD" });
  expect(head.headers.get("content-length")).toBe("10");
  expect(await head.text()).toBe("");
});
it.each(["private", "unlicensed", "missing"])(
  "keeps %s files outside the library route",
  async (name) => {
    expect((await fetch(base + `stories/house/media/${name}.webp`)).status).toBe(404);
  },
);
it.each(["bytes=20-", "bytes=8-3"])("rejects invalid ranges %s", async (range) => {
  const response = await fetch(base + "stories/house/media/test.webp", {
    headers: { Range: range },
  });
  expect(response.status).toBe(416);
});
it("does not accept writes to the media library", async () => {
  expect((await fetch(base + "stories/house/media/test.webp", { method: "POST" })).status).toBe(
    404,
  );
});
