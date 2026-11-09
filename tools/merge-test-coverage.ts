import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseAstAsync } from "vitest/node";
import { convert } from "ast-v8-to-istanbul";
import { createCoverageMap } from "@vitest/istanbul-lib-coverage";
import type { Page } from "@playwright/test";

type Script = Awaited<ReturnType<Page["coverage"]["stopJSCoverage"]>>[number];

const directory = resolve("coverage/browser-v8");
const merged = createCoverageMap(
  JSON.parse(await readFile("coverage/unit/coverage-final.json", "utf8"), (key, value) =>
    key === "column" && value === null ? Infinity : value,
  ),
);
for (const file of await readdir(directory)) {
  for (const script of JSON.parse(await readFile(resolve(directory, file), "utf8")) as Script[]) {
    if (!/\.[jt]sx?$/.test(new URL(script.url).pathname)) continue;
    const code = script.source!;
    const encoded = code.match(/sourceMappingURL=data:application\/json;base64,([^\s]+)/)?.[1];
    if (!encoded) throw new Error(`Missing source map for ${script.url}`);
    const sourceMap = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    const file = resolve(new URL(script.url).pathname.slice(1));
    if (sourceMap.sourcesContent[0] !== (await readFile(file, "utf8")))
      throw new Error(`Stale browser source map for ${file}`);
    const url = pathToFileURL(file).href;
    merged.merge(
      await convert({
        ast: parseAstAsync(code),
        code,
        wrapperLength: 0,
        coverage: { ...script, url },
        sourceMap,
      }),
    );
  }
}
await mkdir("coverage", { recursive: true });
const report = merged.toJSON();
for (const [file, coverage] of Object.entries(report)) {
  const lines = (await readFile(file, "utf8")).split("\n");
  // Source maps use Infinity for end-of-line columns; JSON represents it as null.
  report[file] = JSON.parse(
    JSON.stringify(coverage, (_key, point) => {
      if (point?.column === Infinity) return { ...point, column: lines[point.line - 1]!.length };
      return point;
    }),
  );
}
await writeFile("coverage/coverage-final.json", JSON.stringify(report));
console.log(`Measured coverage: ${merged.files().length} source files`);
