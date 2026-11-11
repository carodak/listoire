import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { refreshedHouseProject } from "../../../tests/fixtures/house-project.ts";
import { compileLanguage } from "./compiler.ts";
import { withMediaReferences } from "./media-script.ts";
import { ProjectHistory } from "./project-history.ts";
import { declaredPassages, synchronizeScenes } from "./scene-script.ts";
import { readEditorRecord, writeEditorRecord } from "../../persistence/editor-store.ts";

it("removes obsolete scene properties and media references before saving and publishing", async () => {
  const project = structuredClone(refreshedHouseProject);
  project.languages.en!.script =
    "-> start\n=== start ===\nA new beginning. # segment:start.one\n// @media intro/old-image\n-> END";
  const next = withMediaReferences(synchronizeScenes(project));
  expect(next.languages.en!.configuration.scenes).toEqual({});
  expect(next.languages.en!.script).not.toContain("@media intro/");
  expect(next.languages.fr).toEqual(withMediaReferences(project).languages.fr);
  expect(project.languages.en!.configuration.scenes!.intro).toBeDefined();
  const bundle = await compileLanguage(next, "en");
  expect(bundle.scenes).toEqual({});
  const record = await readEditorRecord();
  await writeEditorRecord(next, record?.revision ?? 0, "Scene synchronization regression");
  expect((await readEditorRecord())!.draft.languages.en!.configuration.scenes).toEqual({});
});

it("keeps active scene settings and restores cut settings, media and undo together", () => {
  const original = withMediaReferences(refreshedHouseProject);
  const kept = new Map();
  const cut = structuredClone(original);
  cut.languages.en!.script = "=== other ===\nTemporary replacement.\n-> END";
  const removed = withMediaReferences(synchronizeScenes(cut, kept));
  const history = new ProjectHistory();
  history.record(original, removed, "Cut scene");
  expect(history.undo()).toEqual(original);
  expect(history.redo()).toEqual(removed);
  const pasted = structuredClone(removed);
  pasted.languages.en!.script = original.languages.en!.script;
  const restored = withMediaReferences(synchronizeScenes(pasted, kept));
  expect(restored).toEqual(original);
  expect(synchronizeScenes(original)).toEqual(original);
});

it("uses active knot names and passage tags, ignoring commented declarations", () => {
  expect(
    declaredPassages(`// === removed ===
/* === old ===
Text. # passage:old # segment:old.one
*/
=== opening_scene ===
Text. # passage:custom # segment:custom.one
# passage:untagged
-> END`),
  ).toEqual({ custom: ["custom.one"], untagged: [], "opening-scene": ["text"] });
});
