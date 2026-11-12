import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { clear, createStore } from "idb-keyval";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StoryProjectSchema } from "../../contracts/editor-project.ts";
import {
  readEditorRecord,
  readEditorVersion,
  writeEditorRecord,
} from "../../persistence/editor-store.ts";
import { readActiveProject } from "./default-project.ts";
import { compileProject } from "./compiler.ts";

const built = StoryProjectSchema.parse(
  JSON.parse(readFileSync(new URL("../../../stories/house/project.json", import.meta.url), "utf8")),
);
beforeEach(async () => {
  await clear(createStore("listoire-editor", "projects"));
});
afterEach(() => vi.unstubAllGlobals());
function previous(release = "oree-1.1.0") {
  const draft = structuredClone(built);
  draft.release = release;
  for (const language of Object.values(draft.languages))
    language.configuration.checkpointId = release === "oree-1.2.0" ? "oree-v1-2" : "oree";
  return draft;
}

it.each(["oree-1.1.0", "oree-1.2.0"])(
  "installs the requested revision once and archives the complete %s draft",
  async (release) => {
    const draft = previous(release);
    draft.languages.fr!.script += "\n// An author's working note kept in history\n";
    await writeEditorRecord(draft, 0, "Original story");
    const fetch = vi.fn(async () => new Response(JSON.stringify(built), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const result = await readActiveProject(new AbortController().signal);
    expect(result!.draft).toEqual(built);
    expect(await readEditorVersion(result!.history.at(-2)!.id)).toEqual(draft);
    expect(result!.history.at(-2)!.label).toContain("complete previous draft");
    expect(result!.draft.languages.fr!.configuration.checkpointId).not.toBe(
      draft.languages.fr!.configuration.checkpointId,
    );
    expect(await readActiveProject(new AbortController().signal)).toEqual(result);
    expect(fetch).toHaveBeenCalledTimes(1);
  },
);

it("keeps a renamed custom story and its revision untouched", async () => {
  const draft = previous();
  draft.languages.fr!.configuration.title = "Mon autre histoire";
  const record = await writeEditorRecord(draft, 0, "Custom story");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Must not fetch");
    }),
  );
  expect(await readActiveProject(new AbortController().signal)).toEqual(record);
});

it("preserves the former project offline and a concurrent author's newer revision", async () => {
  const draft = previous();
  const record = await writeEditorRecord(draft, 0, "Original story");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("Offline");
    }),
  );
  expect(await readActiveProject(new AbortController().signal)).toEqual(record);
  const concurrent = structuredClone(draft);
  concurrent.languages.fr!.configuration.title = "Saved in another tab";
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      await writeEditorRecord(concurrent, record.revision, "Author's edit");
      return new Response(JSON.stringify(built), { status: 200 });
    }),
  );
  expect((await readActiveProject(new AbortController().signal))!.draft).toEqual(concurrent);
  expect((await readEditorRecord())!.draft).toEqual(concurrent);
});
it("updates gallery portraits and direction while preserving scripts, voices and checkpoint digests", async () => {
  const draft = structuredClone(built);
  for (const language of Object.values(draft.languages)) {
    for (const encounter of language.configuration.game!.encounters) delete encounter.portrait;
    for (const scene of Object.values(language.configuration.scenes!))
      scene.events = scene.events?.filter((event) => !event.id.endsWith(".board-beat"));
  }
  draft.languages.fr!.script += "\n// Keep this author note\n";
  await writeEditorRecord(draft, 0, "Current draft");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(built), { status: 200 })),
  );
  const updated = await readActiveProject(new AbortController().signal);
  expect(updated!.draft.languages.fr!.script).toBe(draft.languages.fr!.script);
  expect(updated!.draft.languages.fr!.configuration.voiceProfiles).toEqual(
    draft.languages.fr!.configuration.voiceProfiles,
  );
  expect(
    updated!.draft.languages.fr!.configuration.game!.encounters.every((encounter) =>
      encounter.portrait?.startsWith("sketch."),
    ),
  ).toBe(true);
  const before = await compileProject(draft),
    after = await compileProject(updated!.draft);
  for (const locale of ["en", "fr"])
    expect(after[locale]!.inkDigest).toBe(before[locale]!.inkDigest);
  expect(await readEditorVersion(updated!.history.at(-2)!.id)).toEqual(draft);
  expect(await readActiveProject(new AbortController().signal)).toEqual(updated);
});
it("does not repeatedly archive a current draft for a custom encounter without a portrait", async () => {
  const draft = structuredClone(built);
  draft.languages.fr!.configuration.game!.encounters.push({
    id: "custom",
    name: "A future encounter",
    difficulty: "easy",
    profile: "balanced",
  });
  const stored = await writeEditorRecord(draft, 0, "Author's draft");
  const fetch = vi.fn(async () => new Response(JSON.stringify(built), { status: 200 }));
  vi.stubGlobal("fetch", fetch);
  expect(await readActiveProject(new AbortController().signal)).toEqual(stored);
  expect(fetch).not.toHaveBeenCalled();
});
it("does not add a cue for an author-replaced segment or archive an unchanged patch", async () => {
  const draft = structuredClone(built);
  for (const language of Object.values(draft.languages)) {
    language.script = language.script.replace("# segment:atelier.p2", "# segment:atelier.custom");
    const scene = language.configuration.scenes!.atelier!;
    for (const block of scene.blocks!)
      if (block.kind === "text" && block.segmentId === "atelier.p2")
        block.segmentId = "atelier.custom";
    scene.events = scene.events!.filter((event) => event.id !== "atelier.board-beat");
  }
  const stored = await writeEditorRecord(draft, 0, "Author's replacement");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(built), { status: 200 })),
  );
  const after = await readActiveProject(new AbortController().signal);
  expect(after).toEqual(stored);
  await expect(compileProject(after!.draft)).resolves.toHaveProperty("fr");
});
