import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { Compiler } from "inkjs/full";
import { BundleSchema, StoryManifestSchema } from "../src/contracts/story.ts";

const root = new URL("../", import.meta.url);
const metadata = JSON.parse(
  await readFile(new URL("stories/foundation/metadata.json", root), "utf8"),
);
const { version } = JSON.parse(
  await readFile(new URL("node_modules/inkjs/package.json", root), "utf8"),
);
await mkdir(new URL("public/stories/foundation/", root), { recursive: true });
const locales = (["en", "fr"] as const).filter((locale) => metadata[locale]);
const manifest = StoryManifestSchema.parse({
  schemaVersion: 1,
  storyId: metadata.storyId,
  defaultLocale: metadata.defaultLocale,
  locales,
});
for (const locale of ["en", "fr"] as const) {
  if (!locales.includes(locale))
    await rm(new URL(`public/stories/foundation/${locale}.json`, root), { force: true });
}
await writeFile(
  new URL("public/stories/foundation/manifest.json", root),
  `${JSON.stringify(manifest)}\n`,
);

for (const locale of locales) {
  const source = await readFile(new URL(`stories/foundation/${locale}.ink`, root), "utf8");
  const compiled = new Compiler(source).Compile();
  const inkJson = compiled.ToJson();
  if (typeof inkJson !== "string") throw new Error("Ink compilation produced no JSON");
  const bundle = BundleSchema.parse({
    schemaVersion: 1,
    storyId: metadata.storyId,
    release: metadata.release,
    locale,
    mode: "narrative",
    ...metadata[locale],
    inkDigest: createHash("sha256")
      .update(JSON.stringify(JSON.parse(inkJson)))
      .digest("hex"),
    inkjsVersion: version,
    passages: metadata.passages,
    ink: JSON.parse(inkJson),
  });
  await writeFile(
    new URL(`public/stories/foundation/${locale}.json`, root),
    `${JSON.stringify(bundle)}\n`,
  );
  console.log(`Built ${locale}: ${bundle.inkDigest.slice(0, 12)}`);
}
