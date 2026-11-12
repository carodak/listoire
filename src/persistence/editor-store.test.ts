import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { clear, createStore } from "idb-keyval";
import { StoryProjectSchema } from "../contracts/editor-project.ts";
import { readEditorRecord, writeEditorRecord } from "./editor-store.ts";

const project = StoryProjectSchema.parse(
  JSON.parse(
    readFileSync(new URL("../../docs/story-editor/original-project.json", import.meta.url), "utf8"),
  ),
);
const edited = (title: string) => {
  const next = structuredClone(project);
  Object.values(next.languages)[0]!.configuration.title = title;
  return next;
};

beforeEach(() => clear(createStore("listoire-editor", "projects")));
afterEach(() => vi.useRealTimers());

it("saves drafts with revisions and refuses a write based on an older revision", async () => {
  expect(await readEditorRecord()).toBeNull();
  const first = await writeEditorRecord(project, 0, "Original story");
  expect(first.revision).toBe(1);
  const second = await writeEditorRecord(edited("Two"), 1, "Save project");
  expect((await readEditorRecord())!.draft).toEqual(second.draft);
  await expect(writeEditorRecord(edited("Stale"), 1, "Save project")).rejects.toThrow(
    "Another editor tab saved changes",
  );
  expect((await readEditorRecord())!.revision).toBe(2);
});

it("keeps a checkpoint per named save, autosaves at most every 30 s, and the last 30", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-11T10:00:00Z"));
  let record = await writeEditorRecord(project, 0, "Original story");
  record = await writeEditorRecord(edited("A"), record.revision, "Autosave", undefined, "Typed");
  expect(record.history.map((version) => version.label)).toEqual(["Original story"]);
  vi.setSystemTime(new Date("2026-11-11T10:00:31Z"));
  record = await writeEditorRecord(edited("B"), record.revision, "Autosave", undefined, "Typed");
  expect(record.history.map((version) => version.label)).toEqual(["Original story", "Typed"]);
  for (let index = 0; index < 32; index++)
    record = await writeEditorRecord(edited(`Save ${index}`), record.revision, `Save ${index}`);
  const stored = (await readEditorRecord())!;
  expect(stored.history).toHaveLength(30);
  expect(stored.history.at(-1)!.label).toBe("Save 31");
  expect(stored.history.at(-1)!.project).toEqual(edited("Save 31"));
});

it("keeps the published bundles until a new publication replaces them", async () => {
  const published = { revision: 2, bundles: {}, defaults: {} };
  let record = await writeEditorRecord(project, 0, "Original story");
  record = await writeEditorRecord(project, record.revision, "Autosave", published);
  record = await writeEditorRecord(edited("Draft only"), record.revision, "Save project");
  expect((await readEditorRecord())!.published).toEqual(published);
  await expect(
    writeEditorRecord(project, record.revision, "Autosave", { ...published, revision: -1 }),
  ).rejects.toThrow();
  await expect(
    writeEditorRecord({ ...project, storyId: "" } as never, record.revision, "Save project"),
  ).rejects.toThrow();
  expect((await readEditorRecord())!.revision).toBe(record.revision);
});
