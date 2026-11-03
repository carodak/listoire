import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { Compiler } from "inkjs/full";
import { BundleSchema, StoryManifestSchema } from "../src/contracts/story.ts";
import { buildEditorProject } from "./build-editor-project.ts";

const root = new URL("../", import.meta.url);
const { version } = JSON.parse(
  await readFile(new URL("node_modules/inkjs/package.json", root), "utf8"),
);
const metadata = JSON.parse(
  await readFile(new URL("stories/foundation/metadata.json", root), "utf8"),
);
const output = new URL(".fallow/fixtures/", root);
await mkdir(output, { recursive: true });
const locales = (["en", "fr"] as const).filter((locale) => metadata[locale]);
const manifest = StoryManifestSchema.parse({
  schemaVersion: 1,
  storyId: metadata.storyId,
  defaultLocale: metadata.defaultLocale,
  locales,
});
await writeFile(new URL("manifest.json", output), JSON.stringify(manifest) + "\n");
for (const locale of locales) {
  const source = await readFile(new URL(`stories/foundation/${locale}.ink`, root), "utf8");
  const compiled = new Compiler(source).Compile().ToJson();
  if (!compiled) throw new Error("Ink compilation produced no JSON");
  const ink = JSON.parse(compiled);
  const bundle = BundleSchema.parse({
    schemaVersion: 1,
    storyId: metadata.storyId,
    release: metadata.release,
    locale,
    mode: "narrative",
    ...metadata[locale],
    inkDigest: createHash("sha256").update(JSON.stringify(ink)).digest("hex"),
    inkjsVersion: version,
    passages: metadata.passages,
    ink,
  });
  await writeFile(new URL(`${locale}.json`, output), JSON.stringify(bundle) + "\n");
  console.log(`Built foundation/${locale}: ${bundle.inkDigest.slice(0, 12)}`);
}
await buildEditorProject(root);
