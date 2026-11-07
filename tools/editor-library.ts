import { createReadStream } from "node:fs";
import { readFile, realpath, stat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import type { Plugin } from "vite";

export function editorLibrary(): Plugin {
  return {
    name: "local-editor-library",
    async configureServer(server) {
      const root = server.config.root;
      const catalogue = JSON.parse(
        await readFile(resolve(root, "assets/catalog/curated.json"), "utf8"),
      ) as {
        entries: {
          runtimePath?: string;
          optimizedPath: string;
          mediaType: string;
          rights: { officialStoryUse: string };
        }[];
      };
      const entries = new Map(
        catalogue.entries
          .filter((entry) => entry.rights.officialStoryUse === "allowed")
          .map((entry) => [
            `/stories/house/${entry.runtimePath ?? entry.optimizedPath.replace("stories/house/", "")}`,
            entry,
          ]),
      );
      server.middlewares.use((request, response, next) => {
        if (!["GET", "HEAD"].includes(request.method ?? "")) return next();
        const entry = entries.get((request.url ?? "").split("?")[0]!);
        if (!entry) return next();
        void (async () => {
          const source = await realpath(resolve(root, entry.optimizedPath));
          const allowed = [
            resolve(root, ".fallow/library-cache"),
            resolve(root, "stories/house/media"),
          ];
          if (!allowed.some((directory) => source.startsWith(directory + sep))) return next();
          const size = (await stat(source)).size;
          const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
          const start = range ? Number(range[1]) : 0;
          const end = range?.[2] ? Math.min(size - 1, Number(range[2])) : size - 1;
          if (start >= size || end < start) {
            response.writeHead(416, { "Content-Range": `bytes */${size}` });
            response.end();
            return;
          }
          response.writeHead(range ? 206 : 200, {
            "Content-Type": entry.mediaType === "image" ? "image/webp" : "audio/mpeg",
            "Content-Length": end - start + 1,
            "Accept-Ranges": "bytes",
            ...(range ? { "Content-Range": `bytes ${start}-${end}/${size}` } : {}),
          });
          if (request.method === "HEAD") response.end();
          else {
            const stream = createReadStream(source, { start, end });
            stream.on("error", () => response.destroy());
            response.on("close", () => stream.destroy());
            stream.pipe(response);
          }
        })().catch(() => next());
      });
    },
  };
}
