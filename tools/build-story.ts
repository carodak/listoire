import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { Compiler } from "inkjs/full";
import { BundleSchema, StoryManifestSchema } from "../src/contracts/story.ts";

const root = new URL("../", import.meta.url);
const { version } = JSON.parse(
  await readFile(new URL("node_modules/inkjs/package.json", root), "utf8"),
);
const curated = JSON.parse(await readFile(new URL("assets/catalog/curated.json", root), "utf8"));
for (const story of ["foundation", "house"]) {
  const metadata = JSON.parse(
    await readFile(new URL(`stories/${story}/metadata.json`, root), "utf8"),
  );
  const output = new URL(story === "house" ? "public/stories/house/" : ".fallow/fixtures/", root);
  await mkdir(output, { recursive: true });
  const locales = (["en", "fr"] as const).filter((locale) => metadata[locale]);
  const manifest = StoryManifestSchema.parse({
    schemaVersion: 1,
    storyId: metadata.storyId,
    defaultLocale: metadata.defaultLocale,
    locales,
  });
  await writeFile(new URL("manifest.json", output), `${JSON.stringify(manifest)}\n`);
  const referenced = new Set<string>();
  for (const locale of locales) {
    const source = await readFile(new URL(`stories/${story}/${locale}.ink`, root), "utf8");
    const inkJson = new Compiler(source).Compile().ToJson();
    if (typeof inkJson !== "string") throw new Error("Ink compilation produced no JSON");
    const scenes = metadata[locale].scenes ?? {};
    const ids = new Set<string>();
    for (const scene of Object.values(scenes) as { image?: string; sound?: string }[]) {
      if (scene.image) ids.add(scene.image);
      if (scene.sound) ids.add(scene.sound);
    }
    for (const [passageId, scene] of Object.entries(scenes) as [
      string,
      { events?: import("../src/contracts/effects.ts").NarrativeEvent[] },
    ][]) {
      for (const event of scene.events ?? []) {
        if (
          event.trigger.kind === "segment" &&
          !metadata.passages[passageId]?.includes(event.trigger.segmentId)
        )
          throw new Error("Unknown cue segment");
        if (event.action.kind === "audio") ids.add(event.action.assetId);
        if (
          event.action.kind === "effect" &&
          "image" in event.action.effect &&
          event.action.effect.image
        )
          ids.add(event.action.effect.image);
      }
    }
    for (const clip of metadata[locale].narration ?? []) ids.add(clip.assetId);
    if (metadata[locale].examination) ids.add(metadata[locale].examination.image);
    if (metadata[locale].character) ids.add(metadata[locale].character.portrait);
    const assets = [];
    for (const id of ids) {
      const entry = curated.entries.find((candidate: { id: string }) => candidate.id === id);
      if (!entry || entry.rights.officialStoryUse !== "allowed")
        throw new Error(`Unlicensed or missing asset: ${id}`);
      if (
        story === "house" &&
        entry.mediaType === "image" &&
        (!entry.originalPath.startsWith("assets/images/") ||
          entry.originalPath.startsWith("assets/images/reference-house/"))
      )
        throw new Error("House illustrations must come from the downloaded image library");
      const file = entry.optimizedPath.split("/").at(-1);
      if (
        !/^[a-z0-9.-]+\.(webp|mp3)$/.test(file) ||
        entry.optimizedPath !== `stories/${story}/media/${file}`
      )
        throw new Error("Unsafe asset path");
      const bytes = await readFile(new URL(entry.optimizedPath, root));
      if (createHash("sha256").update(bytes).digest("hex") !== entry.runtimeSha256)
        throw new Error(`Stale optimized asset: ${id}`);
      await mkdir(new URL("media/", output), { recursive: true });
      await copyFile(new URL(entry.optimizedPath, root), new URL(`media/${file}`, output));
      referenced.add(file);
      assets.push({
        id,
        path: `media/${file}`,
        type: entry.mediaType,
        alt: metadata[locale].assetAlt?.[id] ?? entry.title,
        ...(entry.credit ? { credit: entry.credit } : {}),
      });
    }
    const localized = { ...metadata[locale] };
    delete localized.assetAlt;
    const bundle = BundleSchema.parse({
      schemaVersion: 1,
      storyId: metadata.storyId,
      release: metadata.release,
      locale,
      mode: metadata.mode ?? "narrative",
      ...localized,
      inkDigest: createHash("sha256")
        .update(JSON.stringify(JSON.parse(inkJson)))
        .digest("hex"),
      inkjsVersion: version,
      passages: metadata.passages,
      ink: JSON.parse(inkJson),
      ...(metadata.variables ? { variables: metadata.variables, assets } : {}),
    });
    await writeFile(new URL(`${locale}.json`, output), `${JSON.stringify(bundle)}\n`);
    console.log(
      `Built ${story}/${locale}: ${bundle.inkDigest.slice(0, 12)}, ${assets.length} assets`,
    );
  }
  if (story === "house") {
    // Remove only stale generated media files inside this fixed output directory.
    for (const file of await readdir(new URL("media/", output))) {
      if (!referenced.has(file) && /^[a-z0-9.-]+\.(webp|mp3)$/.test(file))
        await rm(new URL(`media/${file}`, output));
    }
  }
}
// The historical foundation remains a test fixture, never published with the story.
for (const file of ["en.json", "fr.json", "manifest.json"])
  await rm(new URL(`public/stories/foundation/${file}`, root), { force: true });
