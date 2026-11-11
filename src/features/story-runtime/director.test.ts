import "fake-indexeddb/auto";
import { beforeEach, expect, it, vi } from "vitest";
import { clear, createStore } from "idb-keyval";
import { InkNarrativeEngine } from "./ink-engine.ts";
import { createIndexedDbStore } from "../../persistence/indexeddb-store.ts";
import { SaveManager } from "../../persistence/save-manager.ts";
import { fixtureBundle } from "../../test-fixtures.ts";
import { StoryDirector } from "./director.ts";
import { SAVED_PAGES } from "../../contracts/story.ts";
import { validateCheckpoint } from "../../contracts/save-validation.ts";

const store = createIndexedDbStore();
const saves = new SaveManager(store);
const bundle = fixtureBundle();
const player = (manager = saves) =>
  new StoryDirector(bundle, new InkNarrativeEngine(bundle), manager);

beforeEach(async () => {
  await clear(createStore("listoire", "records"));
});

it("does not advance a choice when the reader closes during its departure animation", async () => {
  let finish!: () => void;
  const presentation = {
    start: vi.fn(),
    cancel: vi.fn(),
    dispose: vi.fn(),
    leave: vi.fn(async () => {}),
  };
  const engine = new InkNarrativeEngine(bundle);
  const choose = vi.spyOn(engine, "choose");
  const director = new StoryDirector(bundle, engine, saves, undefined, presentation);
  await director.load();
  const saved = await saves.backup(bundle);
  presentation.leave.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const changing = director.choose("listen", director.getSnapshot().occurrenceId!);
  director.dispose();
  finish();
  await changing;
  expect(choose).not.toHaveBeenCalled();
  expect(await saves.backup(bundle)).toBe(saved);
});
it("replays presentation without advancing Ink and restores an earlier checkpoint on back", async () => {
  const engine = new InkNarrativeEngine(bundle);
  const advance = vi.spyOn(engine, "advance");
  const presentation = { start: vi.fn(), cancel: vi.fn(), dispose: vi.fn() };
  const director = new StoryDirector(bundle, engine, saves, undefined, presentation);
  await director.load();
  const first = director.getSnapshot().frame;
  await director.choose("listen", director.getSnapshot().occurrenceId!);
  const current = await saves.backup(bundle);
  const calls = advance.mock.calls.length;
  await director.replay();
  expect(advance).toHaveBeenCalledTimes(calls);
  expect(await saves.backup(bundle)).toBe(current);
  expect(presentation.start.mock.calls.at(-1)?.[2]).toBe(false);
  await director.back();
  expect(director.getSnapshot().frame).toEqual(first);
  expect(advance).toHaveBeenCalledTimes(calls);
  expect((await saves.read(bundle))!.frame).toEqual(first);
  director.dispose();
});
it("starts presentation only after commit and tolerates a failed media port", async () => {
  const presentation = {
    start: vi.fn(() => {
      throw new Error("media");
    }),
    cancel: vi.fn(),
    dispose: vi.fn(),
  };
  const director = new StoryDirector(
    bundle,
    new InkNarrativeEngine(bundle),
    saves,
    undefined,
    presentation,
  );
  await director.load();
  expect(director.getSnapshot().failure).toBeNull();
  expect(await saves.read(bundle)).not.toBeNull();
  await director.choose("listen", director.getSnapshot().occurrenceId!);
  expect(director.getSnapshot().frame?.passageId).toBe("landing");
  expect(presentation.start).toHaveBeenCalledTimes(2);
  director.dispose();
  expect(presentation.dispose).toHaveBeenCalledOnce();
});
it("commits a choice once, reloads resolved text, restarts and ignores an old occurrence", async () => {
  const director = player();
  await director.load();
  const occurrence = director.getSnapshot().occurrenceId!;
  await Promise.all([director.choose("listen", occurrence), director.choose("call", occurrence)]);
  expect(director.getSnapshot().frame?.segments[0]!.text).toContain("clock");
  expect((await saves.read(bundle))?.revision).toBe(2);
  const restored = player();
  await restored.load();
  expect(restored.getSnapshot().frame).toEqual(director.getSnapshot().frame);
  await restored.restart();
  expect(restored.getSnapshot().frame?.passageId).toBe("threshold");
  await restored.choose("call", occurrence);
  expect(restored.getSnapshot().frame?.passageId).toBe("threshold");
});

it("rolls back failed writes and allows retry without losing the selected branch", async () => {
  const director = player();
  await director.load();
  const before = await saves.read(bundle);
  const commit = vi.spyOn(saves, "commit").mockRejectedValueOnce(new Error("QuotaExceededError"));
  await director.choose("call", director.getSnapshot().occurrenceId!);
  expect(director.getSnapshot().failure).toBe("storage");
  expect(await saves.read(bundle)).toEqual(before);
  expect(director.getSnapshot().frame?.passageId).toBe("threshold");
  commit.mockRestore();
  await director.choose("listen", director.getSnapshot().occurrenceId!);
  expect(director.getSnapshot().frame?.segments[0]!.text).toContain("clock");
});
it("restarts presentation and clears earlier pages under a new coherent save identity", async () => {
  const presentation = { start: vi.fn(), cancel: vi.fn(), reset: vi.fn(), dispose: vi.fn() };
  const director = new StoryDirector(
    bundle,
    new InkNarrativeEngine(bundle),
    saves,
    undefined,
    presentation,
  );
  await director.load();
  await director.choose("listen", director.getSnapshot().occurrenceId!);
  const previous = await saves.read(bundle);
  await director.restart();
  expect(presentation.reset).toHaveBeenCalledOnce();
  expect(director.getSnapshot()).toMatchObject({
    busy: false,
    failure: null,
    canGoBack: false,
    frame: { passageId: "threshold" },
  });
  const saved = await saves.read(bundle);
  expect(saved!.runId).not.toBe(previous!.runId);
  expect(saved!.revision).toBe(1);
  const restored = player();
  await restored.load();
  expect(restored.getSnapshot().frame).toEqual(director.getSnapshot().frame);
});

it("retries a failed first checkpoint from the initial Ink state", async () => {
  vi.spyOn(saves, "commit").mockRejectedValueOnce(new Error("Unavailable"));
  const director = player();
  await director.load();
  expect(director.getSnapshot().failure).toBe("storage");
  await director.load();
  expect(director.getSnapshot().frame?.passageId).toBe("threshold");
  vi.restoreAllMocks();
});

it("detects concurrent tabs without replacing the winning checkpoint", async () => {
  const first = player();
  await first.load();
  const second = player();
  await second.load();
  await first.choose("call", first.getSnapshot().occurrenceId!);
  await second.choose("listen", second.getSnapshot().occurrenceId!);
  expect(second.getSnapshot().failure).toBe("save-conflict");
  await second.load();
  expect(second.getSnapshot().frame?.segments[0]!.text).toContain("voice");
});

it("preserves malformed and incompatible saves until an explicit restart", async () => {
  const key = "save:foundation:en";
  await store.update(key, () => ({ schemaVersion: 999, important: "keep me" }));
  const director = player();
  await director.load();
  expect(director.getSnapshot().failure).toBe("save-invalid");
  expect(await saves.backup(bundle)).toContain("keep me");
  await director.restart();
  await store.update(key, (previous) => ({
    ...(previous as object),
    inkDigest: "another-build",
  }));
  const incompatible = player();
  await incompatible.load();
  expect(incompatible.getSnapshot().failure).toBe("save-incompatible");
  expect(await saves.backup(bundle)).toContain("another-build");
});

it("isolates EN/FR slots and settings and rejects corrupt settings safely", async () => {
  await player().load();
  const french = fixtureBundle("fr");
  await new StoryDirector(french, new InkNarrativeEngine(french), saves).load();
  const settings = {
    schemaVersion: 2 as const,
    language: "fr" as const,
    welcomeSound: false,
  };
  await saves.saveSettings(settings);
  expect(await saves.settings()).toEqual(settings);
  expect((await saves.read(french))?.locale).toBe("fr");
  expect((await saves.read(bundle))?.locale).toBe("en");
  await store.update("reader-settings", () => ({ interfaceLocale: "xx" }));
  expect((await saves.settings()).language).toBe("en");
});

it("does not publish or write from a disposed asynchronous load", async () => {
  let resolveRead!: (value: null) => void;
  const pendingRead = new Promise<null>((resolve) => {
    resolveRead = resolve;
  });
  const commit = vi.fn();
  const director = new StoryDirector(bundle, new InkNarrativeEngine(bundle), {
    read: () => pendingRead,
    commit,
  });
  const listener = vi.fn();
  director.subscribe(listener);
  const pending = director.load();
  director.dispose();
  listener.mockClear();
  resolveRead(null);
  await pending;
  expect(commit).not.toHaveBeenCalled();
  expect(listener).not.toHaveBeenCalled();
});

it("migrates the previous two-language preference without rewriting story saves", async () => {
  await player().load();
  const before = await saves.backup(bundle);
  await store.update("reader-settings", () => ({
    schemaVersion: 1,
    interfaceLocale: "fr",
    storyLocale: "en",
  }));
  expect(await saves.settings()).toEqual({
    schemaVersion: 2,
    language: "fr",
    welcomeSound: true,
  });
  expect(await saves.backup(bundle)).toBe(before);
});
it("rejects a checkpoint for another story before writing the current slot", async () => {
  await player().load();
  const save = (await saves.read(bundle))!;
  const backup = await saves.backup(bundle);
  await expect(saves.commit(bundle, { ...save, storyId: "another-story" }, save)).rejects.toThrow(
    "save-incompatible",
  );
  expect(await saves.backup(bundle)).toBe(backup);
});

it("can present a fresh start settled, as a reopened page, and later pages as usual", async () => {
  const presentation = { start: vi.fn(), cancel: vi.fn(), dispose: vi.fn() };
  const director = new StoryDirector(
    bundle,
    new InkNarrativeEngine(bundle),
    saves,
    undefined,
    presentation,
  );
  await director.load(true);
  expect(presentation.start.mock.calls.at(-1)?.[2]).toBe(true);
  expect(director.getSnapshot().restored).toBe(true);
  await director.choose("listen", director.getSnapshot().occurrenceId!);
  expect(presentation.start.mock.calls.at(-1)?.[2]).toBe(false);
  expect(director.getSnapshot().restored).toBe(false);
});

it("keeps the previous pages in the save, so Back works after a reload", async () => {
  const first = player();
  await first.load();
  const opening = first.getSnapshot().frame;
  await first.choose("listen", first.getSnapshot().occurrenceId!);
  expect((await saves.read(bundle))!.history).toHaveLength(1);
  first.dispose();
  const reloaded = player();
  await reloaded.load();
  expect(reloaded.getSnapshot().canGoBack).toBe(true);
  await reloaded.back();
  expect(reloaded.getSnapshot()).toMatchObject({ frame: opening, canGoBack: false });
  const saved = (await saves.read(bundle))!;
  expect(saved.frame).toEqual(opening);
  expect(saved.history).toEqual([]);
});

it("keeps at most 20 previous pages, dropping the oldest", async () => {
  const director = player();
  await director.load();
  const start = (await saves.read(bundle))!;
  const pages = Array.from({ length: SAVED_PAGES }, (_, index) => ({
    inkStateJson: start.inkStateJson,
    frame: { ...start.frame, passageId: `page-${index}` },
  }));
  await saves.commit(bundle, { ...start, revision: start.revision + 1, history: pages }, start);
  director.dispose();
  const reloaded = player();
  await reloaded.load();
  await reloaded.choose("listen", reloaded.getSnapshot().occurrenceId!);
  const history = (await saves.read(bundle))!.history!;
  expect(history).toHaveLength(SAVED_PAGES);
  expect(history[0]!.frame.passageId).toBe("page-1");
  expect(history.at(-1)!.frame.passageId).toBe("threshold");
});

it("a save without history loads without Back; a failed write keeps the pages as they were", async () => {
  const director = player();
  await director.load();
  const start = (await saves.read(bundle))!;
  const { history: _, ...old } = start;
  await saves.commit(bundle, { ...old, revision: start.revision + 1 }, start);
  director.dispose();
  const reloaded = player();
  await reloaded.load();
  expect(reloaded.getSnapshot().canGoBack).toBe(false);
  const commit = vi.spyOn(saves, "commit").mockRejectedValueOnce(new Error("QuotaExceededError"));
  await reloaded.choose("listen", reloaded.getSnapshot().occurrenceId!);
  expect(reloaded.getSnapshot()).toMatchObject({ failure: "storage", canGoBack: false });
  commit.mockRestore();
  await reloaded.choose("listen", reloaded.getSnapshot().occurrenceId!);
  expect((await saves.read(bundle))!.history).toHaveLength(1);
});

it("drops saved pages that can't be restored exactly, never the save", async () => {
  const director = player();
  await director.load();
  await director.choose("listen", director.getSnapshot().occurrenceId!);
  const save = (await saves.read(bundle))!;
  expect(validateCheckpoint(bundle, save).history).toHaveLength(1);
  // An earlier compatible Ink version still loads its page, but not its previous pages.
  const update = { ...bundle, inkDigest: "next", compatibleInkDigests: [bundle.inkDigest] };
  expect(validateCheckpoint(update, structuredClone(save))).toMatchObject({ frame: save.frame });
  expect(validateCheckpoint(update, structuredClone(save)).history).toBeUndefined();
  // A damaged list is dropped; the page itself is kept.
  const damaged = { ...structuredClone(save), history: [{ frame: "broken" }] };
  expect(validateCheckpoint(bundle, damaged).history).toBeUndefined();
  expect(validateCheckpoint(bundle, damaged).frame).toEqual(save.frame);
});
