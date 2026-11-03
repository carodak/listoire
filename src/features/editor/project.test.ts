import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { beforeEach, expect, it } from "vitest";
import { clear, createStore } from "idb-keyval";
import { StoryProjectSchema } from "../../contracts/editor-project.ts";
import { compileProject, compileLanguage, structure } from "./compiler.ts";
import { readEditorRecord, writeEditorRecord } from "../../persistence/editor-store.ts";
import { InkNarrativeEngine } from "../story-runtime/ink-engine.ts";
import { BundleSchema } from "../../contracts/story.ts";

const original = StoryProjectSchema.parse(
  JSON.parse(
    readFileSync(
      new URL("../../../docs/story-editor/original-project.json", import.meta.url),
      "utf8",
    ),
  ),
);
beforeEach(async () => {
  await clear(createStore("listoire-editor", "projects"));
});

it("preserves every original paragraph, branch, fact and presentation configuration in both languages", async () => {
  const compiled = await compileProject(original);
  for (const locale of ["en", "fr"]) {
    const baseline = BundleSchema.parse(
      JSON.parse(
        readFileSync(
          new URL(`../../../public/stories/house/${locale}.json`, import.meta.url),
          "utf8",
        ),
      ),
    );
    const migrated = compiled[locale]!;
    expect(migrated.scenes).toEqual(original.languages[locale]!.configuration.scenes);
    expect(migrated.assets).toEqual(original.languages[locale]!.configuration.assets);
    expect(migrated.narration).toEqual(original.languages[locale]!.configuration.narration);
    expect(migrated.inkDigest).toBe(baseline.inkDigest);
    for (const song of [false, true])
      for (const light of [false, true])
        for (const photo of [false, true])
          for (const examine of [false, true]) {
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
          }
  }
});

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
