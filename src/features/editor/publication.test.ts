import { afterEach, beforeEach, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { StoryProjectSchema } from "../../contracts/editor-project.ts";
import { defaultReadingPreferences } from "../../contracts/presentation.ts";
import { NarrativeEventSchema } from "../../contracts/narrative-events.ts";
import { buildEditorProject } from "../../../tools/build-editor-project.ts";
import { magicCues } from "../../../tools/magic-direction.ts";
import { compileProject } from "./compiler.ts";

let directory: string;
let root: URL;
const bytes = Buffer.from("licensed test artwork");
const entry = {
  id: "test.image",
  title: "Test",
  sourceCollection: "test",
  suggested: { themes: [], roles: [] },
  optimizedPath: ".fallow/library-cache/image.webp",
  runtimePath: "media/image.webp",
  originalPath: "assets/images/test/image.png",
  mediaType: "image",
  runtimeSha256: createHash("sha256").update(bytes).digest("hex"),
  rights: { officialStoryUse: "allowed" },
};
beforeEach(async () => {
  directory = await mkdtemp(resolve(".fallow/publication-"));
  root = pathToFileURL(directory + sep);
  for (const path of [
    "stories/house",
    "assets/catalog",
    ".fallow/library-cache",
    "public/stories/house/media",
  ])
    await mkdir(new URL(path + "/", root), { recursive: true });
  const language = {
    script: "-> start\n=== start ===\nA test. # segment:start.one\n-> END",
    description: "",
    missingTranslation: false,
    cover: "test.image",
    narrationMode: "disabled",
    defaults: defaultReadingPreferences,
    configuration: {
      title: "Test",
      chapter: "One",
      assets: [{ id: entry.id, path: entry.runtimePath, type: "image", alt: "Test" }],
    },
  };
  const project = StoryProjectSchema.parse({
    schemaVersion: 1,
    storyId: "house",
    release: "test",
    defaultLocale: "en",
    gameMode: "narrative",
    variables: [],
    languages: { en: language, fr: language },
  });
  await writeFile(new URL("stories/house/project.json", root), JSON.stringify(project));
  await writeFile(new URL(entry.optimizedPath, root), bytes);
  await writeFile(
    new URL("assets/catalog/curated.json", root),
    JSON.stringify({ entries: [entry] }),
  );
});
afterEach(async () => {
  if (!directory.startsWith(resolve(".fallow") + sep))
    throw new Error("Unexpected publication test directory");
  await rm(directory, { recursive: true, force: true });
});
it("publishes both languages, copies only referenced licensed files and removes stale output", async () => {
  await writeFile(new URL("public/stories/house/media/stale.webp", root), "stale");
  await buildEditorProject(root);
  expect(await readdir(new URL("public/stories/house/media/", root))).toEqual(["image.webp"]);
  expect(await readFile(new URL("public/stories/house/media/image.webp", root))).toEqual(bytes);
  expect(
    JSON.parse(await readFile(new URL("public/stories/house/manifest.json", root), "utf8")),
  ).toMatchObject({ locales: ["en", "fr"] });
});
it("builds a fresh checkout from the copy kept beside the story (REVIEW #1)", async () => {
  await buildEditorProject(root);
  const kept = new URL("stories/house/media/image.webp", root);
  expect(await readFile(kept)).toEqual(bytes);
  // A fresh checkout has no ignored library cache and no generated output.
  await rm(new URL(".fallow/library-cache/", root), { recursive: true });
  await rm(new URL("public/stories/house/media/image.webp", root));
  await buildEditorProject(root);
  expect(await readFile(new URL("public/stories/house/media/image.webp", root))).toEqual(bytes);
  await writeFile(kept, "edited by hand");
  await expect(buildEditorProject(root)).rejects.toThrow("Stale editor asset test.image");
});
it("merges generated preview clips without replacing an approved recording", async () => {
  const project = StoryProjectSchema.parse(
    JSON.parse(await readFile(new URL("stories/house/project.json", root), "utf8")),
  );
  const clip = {
    segmentId: "start.one",
    locale: "en",
    voiceId: "nano-default",
    spokenTextDigest: "a".repeat(64),
    assetId: "narration." + "b".repeat(64),
    audioDigest: createHash("sha256").update(bytes).digest("hex"),
    durationMs: 1000,
    marks: [],
    approval: { status: "preview" as const, reviewer: "test", rightsReference: "test" },
  };
  const bundles = await compileProject(project);
  await writeFile(
    new URL("stories/house/narration.json", root),
    JSON.stringify({ inkDigests: { en: bundles.en!.inkDigest }, clips: [{ clip }] }),
  );
  await mkdir(new URL("stories/house/media/", root), { recursive: true });
  await writeFile(new URL(`stories/house/media/${clip.assetId}.mp3`, root), bytes);
  await buildEditorProject(root);
  const published = JSON.parse(
    await readFile(new URL("public/stories/house/en.json", root), "utf8"),
  );
  expect(published.narration).toEqual([clip]);
  project.languages.en!.configuration.narration = [
    { ...clip, approval: { ...clip.approval, status: "approved" } },
  ];
  project.languages.en!.configuration.assets!.push({
    id: clip.assetId,
    path: `media/${clip.assetId}.mp3`,
    type: "audio",
    alt: "",
  });
  await writeFile(new URL("stories/house/project.json", root), JSON.stringify(project));
  await buildEditorProject(root);
  expect(
    JSON.parse(await readFile(new URL("public/stories/house/en.json", root), "utf8")).narration[0]
      .approval.status,
  ).toBe("approved");
});
it.each([
  [{ rights: { officialStoryUse: "denied" } }, "Unlicensed"],
  [{ mediaType: "audio" }, "type mismatch"],
  [{ originalPath: "assets/images/reference-house/test.png" }, "downloaded library"],
  [{ runtimePath: "media/other.webp" }, "path mismatch"],
  [{ runtimeSha256: "0".repeat(64) }, "Stale"],
])("rejects unverified publication metadata %j", async (patch, error) => {
  await writeFile(
    new URL("assets/catalog/curated.json", root),
    JSON.stringify({ entries: [{ ...entry, ...patch }] }),
  );
  await expect(buildEditorProject(root)).rejects.toThrow(error);
});
it("keeps declarative sound timing and board effects valid without changing story state", () => {
  const sound = {
    rain: "rain",
    pages: "pages",
    magic: "magic",
    birds: "birds",
    air: "air",
    water: "water",
    impact: "impact",
    bells: "bells",
  };
  expect(magicCues("atelier", sound)).toMatchObject([
    { id: "atelier.rain", action: { loop: true, fadeMs: 1400 } },
    { id: "atelier.score" },
    { id: "atelier.board-beat", trigger: { segmentId: "atelier.p2" } },
  ]);
  for (const id of [
    "lettre",
    "bibliotheque",
    "passage",
    "lueur",
    "air-test",
    "ecoute-test",
    "serre",
    "apres",
    "preuve",
    "duel",
    "air-result",
    "ecoute-result",
    "formule",
  ])
    for (const cue of magicCues(id, sound))
      expect(NarrativeEventSchema.safeParse(cue).success).toBe(true);
  for (const id of ["fin", "constructor", "__proto__"]) expect(magicCues(id, sound)).toEqual([]);
});
