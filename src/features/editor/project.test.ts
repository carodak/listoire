import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { beforeEach, expect, it } from "vitest";
import { clear, createStore } from "idb-keyval";
import { StoryProjectSchema } from "../../contracts/editor-project.ts";
import { compileProject, compileLanguage, structure } from "./compiler.ts";
import { readEditorRecord, writeEditorRecord } from "../../persistence/editor-store.ts";
import { InkNarrativeEngine } from "../story-runtime/ink-engine.ts";
import { BundleSchema } from "../../contracts/story.ts";
import { refreshDefaultArtwork, refreshPublishedArtwork } from "../../contracts/artwork-refresh.ts";

const original = StoryProjectSchema.parse(
  JSON.parse(
    readFileSync(
      new URL("../../../docs/story-editor/original-project.json", import.meta.url),
      "utf8",
    ),
  ),
);
const current = StoryProjectSchema.parse(
  JSON.parse(readFileSync(new URL("../../../stories/house/project.json", import.meta.url), "utf8")),
);
beforeEach(async () => {
  await clear(createStore("listoire-editor", "projects"));
});

it("refreshes legacy art atomically while preserving authored text, custom covers, voices and checkpoints", async () => {
  const source = structuredClone(current);
  const draft = structuredClone(original);
  draft.languages.en!.configuration.title = "My edited title";
  draft.languages.en!.cover = "heritage.key";
  const result = refreshDefaultArtwork(draft, source);
  expect(refreshDefaultArtwork(draft, null)).toBe(draft);
  expect(result.languages.en!.script).toBe(draft.languages.en!.script);
  expect(result.languages.en!.configuration.title).toBe("My edited title");
  expect(result.languages.en!.cover).toBe("heritage.key");
  expect(result.languages.en!.configuration.narration).toEqual(
    draft.languages.en!.configuration.narration,
  );
  expect(result.languages.en!.configuration.character!.abilities).toEqual(
    draft.languages.en!.configuration.character!.abilities,
  );
  expect(result.languages.en!.configuration.examination).toMatchObject({
    image: "tcp.human8-cutout",
    hotspot: { x: 82, y: 84 },
  });
  expect(result.languages.en!.configuration.scenes!.intro!.blocks![0]).toMatchObject({
    layout: "right",
    image: "tcp.human8-cutout",
  });
  expect(result.languages.en!.configuration.scenes!.call!.blocks![0]).toMatchObject({
    layout: "right",
    image: "tcp.human5-cutout",
  });
  await expect(compileProject(result)).resolves.toHaveProperty("en");
  expect(refreshDefaultArtwork(result, source)).toBe(result);
  expect(draft.languages.en!.configuration.examination!.image).toBe("tcp.human5");
  source.languages.en!.configuration.assets = [];
  expect(refreshDefaultArtwork(draft, source).languages.en).toEqual(draft.languages.en);
});

it("replaces generated defaults without overwriting an author's right-page block", async () => {
  const draft = structuredClone(current);
  const language = draft.languages.en!;
  language.configuration.assets!.push({
    id: "shadow.woman",
    path: "media/shadow.woman.webp",
    type: "image",
    alt: "Old generated default",
  });
  language.cover = "shadow.woman";
  language.configuration.character!.portrait = "shadow.woman";
  const blocks = language.configuration.scenes!.intro!.blocks!;
  const art = blocks.find((block) => block.kind === "media" && block.layout === "right")!;
  if (art.kind !== "media") throw new Error("Missing fixture artwork");
  art.image = "heritage.key";
  const result = refreshDefaultArtwork(draft, current);
  expect(
    result.languages.en!.configuration.assets!.some((asset) => asset.id.startsWith("shadow.")),
  ).toBe(false);
  expect(result.languages.en!.configuration.character!.portrait).toBe("tcp.human8-cutout");
  expect(
    result.languages.en!.configuration.scenes!.intro!.blocks!.filter(
      (block) => block.kind === "media" && block.layout === "right",
    ),
  ).toEqual([art]);
  expect(result.languages.en!.script).toBe(language.script);
  await expect(compileProject(result)).resolves.toHaveProperty("en");
  expect(refreshDefaultArtwork(result, current)).toBe(result);
});

it("refreshes a previously published book without changing its Ink, narration or save identity", async () => {
  const published = await compileLanguage(original, "en");
  const source = await compileLanguage(current, "en");
  const result = refreshPublishedArtwork(published, source);
  expect(result.ink).toEqual(published.ink);
  expect(result.inkDigest).toBe(published.inkDigest);
  expect(result.release).toBe(published.release);
  expect(result.narration).toEqual(published.narration);
  expect(result.scenes!.intro!.blocks![0]).toMatchObject({
    layout: "right",
    image: "tcp.human8-cutout",
  });
  expect(result.scenes!.call!.blocks![0]).toMatchObject({
    layout: "right",
    image: "tcp.human5-cutout",
  });
  expect(published.scenes!.intro!.blocks![0]).toMatchObject({ kind: "text" });
  expect(refreshPublishedArtwork(result, source)).toBe(result);
});

it("publishes the selected cover and rejects missing or non-image cover assets", async () => {
  const project = structuredClone(original);
  project.languages.en!.cover = "tcp.human5";
  expect((await compileLanguage(project, "en")).cover).toBe("tcp.human5");
  project.languages.en!.cover = "missing";
  await expect(compileLanguage(project, "en")).rejects.toThrow(/cover/);
  project.languages.en!.cover = project.languages.en!.configuration.assets!.find(
    (a) => a.type === "audio",
  )!.id;
  await expect(compileLanguage(project, "en")).rejects.toThrow(/cover/);
});

const storyPaths = Array.from({ length: 32 }, (_, index) => ({
  locale: index < 16 ? "en" : "fr",
  song: Boolean(index & 1),
  light: Boolean(index & 2),
  photo: Boolean(index & 4),
  examine: Boolean(index & 8),
}));
it.each(storyPaths)(
  "preserves $locale: song=$song, light=$light, photo=$photo, examine=$examine",
  async ({ locale, song, light, photo, examine }) => {
    const migrated = await compileLanguage(original, locale);
    const baseline = BundleSchema.parse(
      JSON.parse(
        readFileSync(
          new URL(`../../../public/stories/house/${locale}.json`, import.meta.url),
          "utf8",
        ),
      ),
    );
    expect(migrated.scenes).toEqual(original.languages[locale]!.configuration.scenes);
    expect(migrated.assets).toEqual(original.languages[locale]!.configuration.assets);
    expect(migrated.narration).toEqual(original.languages[locale]!.configuration.narration);
    expect(migrated.inkDigest).toBe(baseline.inkDigest);
    const oldEngine = new InkNarrativeEngine({ ...baseline, authored: false });
    let newEngine = new InkNarrativeEngine(migrated);
    expect(newEngine.advance()).toEqual(oldEngine.advance());
    const choices = [
      ...(examine ? ["examine-photo"] : []),
      "intro.call",
      song ? "call.song" : "call.room",
      `${song ? "song" : "room"}.arrival`,
      light ? "arrival.light" : "arrival.break",
      `${light ? "light" : "break"}.last`,
      photo ? "last.photo" : "last.window",
      `${photo ? "photo" : "window"}.end`,
    ];
    for (const choice of choices) {
      oldEngine.choose(choice);
      newEngine.choose(choice);
      const frame = newEngine.advance();
      expect(frame).toEqual(oldEngine.advance());
      const saved = newEngine.serialize();
      newEngine = new InkNarrativeEngine(migrated);
      newEngine.restore(saved, frame);
    }
  },
);

it("rejects broken destinations, missing translations, and structural drift before publication", async () => {
  const project = structuredClone(original);
  project.languages.en!.script += "\n=== broken ===\n-> nowhere\n";
  await expect(compileProject(project)).rejects.toThrow();
  project.languages.en!.script = original.languages.en!.script.replace(
    "~ caller += 5",
    "~ caller += 6",
  );
  await expect(compileProject(project)).rejects.toThrow(/structure differs/);
  project.languages.en!.script = original.languages.en!.script;
  project.languages.fr!.missingTranslation = true;
  await expect(compileProject(project)).rejects.toThrow(/translation needs review/);
});

it("keeps native Ink choices, tunnels, tunnel returns and stitches playable without mandatory author tags", async () => {
  const project = structuredClone(original);
  project.languages.en!.configuration = { title: "Native Ink", chapter: "Test" };
  project.languages.en!.script =
    "-> start\n=== start ===\nBefore.\n-> dream ->\nAfter.\n* [Continue] -> finish\n=== dream ===\nInside.\n->->\n=== finish ===\n= last\nDone.\n-> END\n";
  const bundle = await compileLanguage(project, "en");
  const engine = new InkNarrativeEngine(bundle);
  const frame = engine.advance();
  expect(frame.segments.map((s) => s.text)).toEqual(["Before.", "Inside.", "After."]);
  engine.choose(frame.choices[0]!.id);
  expect(engine.advance().segments[0]!.text).toBe("Done.");
});

it("saves invalid Ink drafts without replacing the last published reader and detects concurrent writers", async () => {
  const published = { revision: 1, bundles: await compileProject(original), defaults: {} };
  await writeEditorRecord(original, 0, "Initial project", published);
  const invalid = structuredClone(original);
  invalid.languages.en!.script = "-> missing_target";
  await writeEditorRecord(invalid, 1, "Autosave");
  const saved = await readEditorRecord();
  expect(saved!.draft.languages.en!.script).toBe("-> missing_target");
  expect(saved!.published!.bundles.en!.inkDigest).toBe(published.bundles.en!.inkDigest);
  await expect(writeEditorRecord(original, 1, "Stale writer")).rejects.toThrow(
    /Another editor tab/,
  );
  expect((await readEditorRecord())!.draft).toEqual(invalid);
});

it("compares executable structure rather than translated text", () => {
  expect(structure(original.languages.en!.script)).toBe(structure(original.languages.fr!.script));
});
