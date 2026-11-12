import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";

async function sourceDigest() {
  const hash = createHash("sha256");
  for (const root of ["src", "tools", "tests"])
    for (const entry of (await readdir(root, { recursive: true })).sort()) {
      if (!/\.[cm]?[jt]sx?$/.test(entry)) continue;
      hash.update(entry).update(await readFile(resolve(root, entry)));
    }
  return hash.digest("hex");
}

const browserDirectory = resolve("coverage/browser-v8");
await mkdir(browserDirectory, { recursive: true });
for (const file of await readdir(browserDirectory))
  if (file.endsWith(".json")) await unlink(resolve(browserDirectory, file));
await unlink("coverage/coverage-final.json").catch((error: NodeJS.ErrnoException) => {
  if (error.code !== "ENOENT") throw error;
});
const before = await sourceDigest();
const commands = [
  [
    "node_modules/vitest/vitest.mjs",
    "run",
    "--coverage",
    "--coverage.provider=v8",
    "--coverage.reporter=json",
    "--coverage.reportsDirectory=coverage/unit",
  ],
  [
    "node_modules/@playwright/test/cli.js",
    "test",
    "tests/e2e/editor.spec.ts",
    "tests/e2e/typography.spec.ts",
    "tests/e2e/reader-pages.spec.ts",
    "tests/e2e/reader-combat.spec.ts",
    "tests/e2e/reader-saves.spec.ts",
    "tests/e2e/image-composition.spec.ts",
    "tests/e2e/presentation.spec.ts",
    "tests/e2e/effects.spec.ts",
    "tests/e2e/reader-data.spec.ts",
    "tests/e2e/game-authoring.spec.ts",
    "tests/e2e/react-bits.spec.ts",
    "--project=chromium",
    "--workers=1",
  ],
];
for (const args of commands) {
  const result = spawnSync(process.execPath, args, {
    stdio: "inherit",
    env: { ...process.env, FALLOW_BROWSER_COVERAGE: browserDirectory },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (before !== (await sourceDigest()))
  throw new Error("Sources changed during coverage capture; run it again.");
await import("./merge-test-coverage.ts");
