import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";
import { clear, createStore, get, keys, set } from "idb-keyval";
import { StoryProjectSchema } from "../contracts/editor-project.ts";
import { readEditorRecord, readEditorVersion, writeEditorRecord } from "./editor-store.ts";

const interrupt = vi.hoisted(() => ({ readBack: false }));
vi.mock("idb-keyval", async (original) => {
  const idb = await original<typeof import("idb-keyval")>();
  // A tab closed between writing the moved history and checking it reads the old record next time.
  return {
    ...idb,
    getMany: (...args: Parameters<typeof idb.getMany>) =>
      interrupt.readBack ? Promise.reject(new Error("Tab closed")) : idb.getMany(...args),
  };
});

const project = StoryProjectSchema.parse(
  JSON.parse(
    readFileSync(new URL("../../docs/story-editor/original-project.json", import.meta.url), "utf8"),
  ),
);
/** The Orée record as the editor stored it before history versions had their own keys. */
const oree = JSON.parse(
  brotliDecompressSync(
    readFileSync(new URL("../../tests/fixtures/oree-editor-record.json.br", import.meta.url)),
  ).toString("utf8"),
);
const edited = (title: string) => {
  const next = structuredClone(project);
  Object.values(next.languages)[0]!.configuration.title = title;
  return next;
};
const store = createStore("listoire-editor", "projects");

beforeEach(() => clear(store));
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  interrupt.readBack = false;
});

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
  expect(await readEditorVersion(stored.history.at(-1)!.id)).toEqual(edited("Save 31"));
  // Each version is its own key; the dropped ones are deleted with them.
  expect(
    (await keys(store)).filter((key) => String(key).startsWith("house/version/")),
  ).toHaveLength(30);
});

it("drops the oldest versions beyond the history byte budget, never the newest", async () => {
  // 30 copies of the real 2.3 MB Orée project are over the 64 MB budget.
  let record = await writeEditorRecord(oree.draft, 0, "First");
  for (let index = 1; index < 30; index++) {
    const next = structuredClone(oree.draft);
    next.languages.en.configuration.title = `Save ${index}`;
    record = await writeEditorRecord(next, record.revision, `Save ${index}`);
  }
  const total = record.history.reduce((sum, version) => sum + version.size, 0);
  expect(total).toBeLessThanOrEqual(64_000_000);
  expect(record.history.length).toBeLessThan(30);
  expect(record.history.at(-1)!.label).toBe("Save 29");
  const oldest = await readEditorVersion(record.history[0]!.id);
  expect(oldest.languages.en!.configuration.title).toBe(record.history[0]!.label);
  expect(
    (await keys(store)).filter((key) => String(key).startsWith("house/version/")),
  ).toHaveLength(record.history.length);
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

it("moves a real Orée record to one key per version, then deletes the old record", async () => {
  await set("house", oree, store);
  const record = (await readEditorRecord())!;
  expect(record.revision).toBe(oree.revision);
  expect(record.draft).toEqual(oree.draft);
  expect(record.published).toEqual(oree.published);
  expect(record.history.map(({ at, label }) => ({ at, label }))).toEqual(
    oree.history.map(({ at, label }: { at: string; label: string }) => ({ at, label })),
  );
  for (const [index, version] of record.history.entries())
    expect(await readEditorVersion(version.id)).toEqual(oree.history[index].project);
  expect(await get("house", store)).toBeUndefined();
  const next = await writeEditorRecord(oree.draft, record.revision, "Save project");
  expect(next.history.map((version) => version.id)).toEqual([
    ...record.history.map((version) => version.id),
    record.history.length + 1,
  ]);
});

it("keeps using the old record when a move is interrupted, and finishes it on the next load", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  await set("house", oree, store);
  interrupt.readBack = true;
  const record = (await readEditorRecord())!;
  expect(warn).toHaveBeenCalledOnce();
  expect(await get("house", store)).toEqual(oree);
  expect(record.draft).toEqual(oree.draft);
  // Saves keep going to the old record while it is the one in use.
  const saved = await writeEditorRecord(edited("Meanwhile"), record.revision, "Save project");
  expect(await readEditorVersion(saved.history.at(-1)!.id)).toEqual(edited("Meanwhile"));
  expect(((await get("house", store)) as typeof oree).draft).toEqual(edited("Meanwhile"));

  interrupt.readBack = false;
  const moved = (await readEditorRecord())!;
  expect(warn).toHaveBeenCalledOnce();
  expect(await get("house", store)).toBeUndefined();
  expect(moved.revision).toBe(saved.revision);
  expect(moved.draft).toEqual(edited("Meanwhile"));
  expect(moved.history.map((version) => version.label)).toEqual(
    saved.history.map((version) => version.label),
  );
  expect(await readEditorVersion(moved.history.at(-1)!.id)).toEqual(edited("Meanwhile"));
  expect(await readEditorVersion(moved.history[0]!.id)).toEqual(oree.history[0].project);
});

it("reads a record already in the new format as it is", async () => {
  const warn = vi.spyOn(console, "warn");
  const written = await writeEditorRecord(project, 0, "Original story");
  const before = await keys(store);
  expect(await readEditorRecord()).toEqual(written);
  expect(await keys(store)).toEqual(before);
  expect(await get("house", store)).toBeUndefined();
  expect(warn).not.toHaveBeenCalled();
});
