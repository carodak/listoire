import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import { StoryProjectSchema } from "../../contracts/editor-project.ts";
import { insertLocalized } from "./localized-insertion.ts";
import { buildInkCommand, outlineEntries } from "./ink-commands.ts";
import { withMediaReferences, editMediaScript, mediaReferenceLine } from "./media-references.ts";
import { animationOptions } from "./animation-options.ts";
import { speechOptions } from "../media/speech-options.ts";
import { defaultSpeechSettings } from "../../contracts/media.ts";
import { mediaDefaults, applyMediaEdit } from "./media-authoring.ts";
import { addLanguage } from "./add-language.ts";
import { compileLanguage, structure } from "./compiler.ts";
import { verifyMediaAssets } from "./asset-validation.ts";
import { fixtureBundle } from "../../test-fixtures.ts";
import { InkNarrativeEngine } from "../story-runtime/ink-engine.ts";
import { editorShortcut } from "./editor-shortcuts.ts";

const original = StoryProjectSchema.parse(
  JSON.parse(
    readFileSync(
      new URL("../../../docs/story-editor/original-project.json", import.meta.url),
      "utf8",
    ),
  ),
);
afterEach(() => vi.restoreAllMocks());

it("lists Knot and Stitch paths and makes existing media discoverable without changing Ink", () => {
  expect(outlineEntries("=== start ===\n= first\nHello\n=== end ===")).toMatchObject([
    { path: "start", kind: "Knot" },
    { path: "start.first", kind: "Stitch" },
    { path: "end", kind: "Knot" },
  ]);
  const annotated = withMediaReferences(original);
  expect(structure(annotated.languages.en!.script)).toBe(structure(original.languages.en!.script));
  expect(withMediaReferences(annotated)).toEqual(annotated);
  const row = mediaReferenceLine(annotated.languages.en!.script, "intro", "intro.illustration");
  expect(row).toBeGreaterThan(0);
  const changed = editMediaScript(
    annotated.languages.en!,
    annotated.languages
      .en!.script.split("\n")
      .filter((_, index) => index !== row)
      .join("\n"),
  );
  expect(
    changed.configuration.scenes!.intro!.blocks!.some(
      (block) => block.kind === "media" && block.id === "intro.illustration",
    ),
  ).toBe(false);
  expect(
    changed.configuration.scenes!.intro!.events!.some(
      (event) => event.blockId === "intro.illustration",
    ),
  ).toBe(false);
});

it("filters effects by target and preserves the chosen image effect", () => {
  expect(animationOptions("page", [])).toContain("fog-overlay");
  expect(animationOptions("image", ["image"])).not.toContain("fog-overlay");
  expect(animationOptions("transition", [])).toEqual(["fade-out"]);
  const input = mediaDefaults("Animation", "intro", "new");
  input.target = "intro.illustration";
  input.effect = "react-bits.ripple-distortion";
  const next = applyMediaEdit(original, "en", input, [], "passage");
  expect(next.languages.en!.configuration.scenes!.intro!.events!.at(-1)!.action).toMatchObject({
    kind: "effect",
    effect: { id: input.effect },
  });
  input.effect = "fog-overlay";
  expect(() => applyMediaEdit(original, "en", input, [], "passage")).toThrow(/compatible/);
  input.target = "transition";
  input.effect = "fade-out";
  expect(
    applyMediaEdit(
      original,
      "en",
      input,
      [],
      "segment",
    ).languages.en!.configuration.scenes!.intro!.events!.at(-1),
  ).toMatchObject({
    phase: "exit",
    blockId: "page",
    trigger: { kind: "passage" },
    action: { effect: { target: "canvas" } },
  });
});

it("uses generation settings and voice examples in clip matching, while leaving playback speed separate", async () => {
  expect(await speechOptions("nano-default")).toEqual({});
  const first = await speechOptions("nano-default", undefined, defaultSpeechSettings);
  expect(
    (await speechOptions("nano-default", undefined, { ...defaultSpeechSettings, pitch: 2 }))
      .settingsKey,
  ).not.toBe(first.settingsKey);
  expect(await speechOptions("nano-default", undefined, { ...defaultSpeechSettings })).toEqual(
    first,
  );
});

it("allows images in new native Ink Knots without requiring stable segment tags", async () => {
  const project = structuredClone(original);
  project.languages.en!.configuration = {
    title: "Native",
    chapter: "Story",
    assets: original.languages.en!.configuration.assets,
  };
  project.languages.en!.script = "-> dream_sequence\n=== dream_sequence ===\nHello.\n-> END";
  const input = mediaDefaults("Image", "dream-sequence", "image");
  input.asset = "tcp.human5";
  const next = applyMediaEdit(project, "en", input, [], "passage");
  expect((await compileLanguage(next, "en")).scenes!["dream-sequence"]!.blocks).toContainEqual(
    expect.objectContaining({ kind: "media", image: "tcp.human5" }),
  );
});

it("shares undo/redo/save shortcuts while keeping unapplied dialog edits local", () => {
  const actions = { undo: vi.fn(), redo: vi.fn(), save: vi.fn(async () => {}) };
  const event = {
    key: "z",
    ctrlKey: true,
    metaKey: false,
    shiftKey: false,
    target: null,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
  editorShortcut(event, actions);
  expect(actions.undo).toHaveBeenCalledOnce();
  editorShortcut({ ...event, shiftKey: true }, actions);
  expect(actions.redo).toHaveBeenCalledOnce();
  editorShortcut({ ...event, key: "s" }, actions);
  expect(actions.save).toHaveBeenCalledOnce();
  editorShortcut({ ...event, target: { closest: () => ({}) } as unknown as EventTarget }, actions);
  expect(actions.undo).toHaveBeenCalledOnce();
});

it("inserts one stable structural command into both languages without replacing translated prose", () => {
  const rows = original.languages.en!.script.split("\n");
  const end = { row: rows.length - 1, column: rows.at(-1)!.length };
  const ink = buildInkCommand(
    "Knot",
    { name: "dream", label: "", condition: "", create: false },
    [],
    "choice-stable",
  );
  const next = insertLocalized(original, "en", ink, { start: end, end }, true);
  expect(next.languages.fr!.script).toBe(original.languages.fr!.script + ink);
  expect(next.languages.en!.script).toBe(original.languages.en!.script + ink);
  expect(next.languages.fr!.missingTranslation).toBe(true);
  expect(original.languages.fr!.missingTranslation).toBe(false);
});

it("refuses to overwrite the middle of a translated sentence when no corresponding cursor is known", () => {
  const rows = original.languages.en!.script.split("\n");
  const row = rows.findIndex((line) => line.startsWith("The first time"));
  const at = { row, column: 12 };
  expect(() =>
    insertLocalized(original, "en", "{condition: text}", { start: at, end: at }, true),
  ).toThrow(/line boundary/);
  expect(original.languages.fr!.script).toContain("photographie");
});

it("builds distinct Ink tunnel calls and returns, and rejects syntax injection through parameters", () => {
  expect(
    buildInkCommand(
      "Tunnel",
      { name: "dream", label: "", condition: "", create: true },
      [],
      "choice-stable",
    ),
  ).toContain("-> dream ->");
  expect(
    buildInkCommand(
      "Tunnel",
      { name: "dream", label: "", condition: "", create: true },
      [],
      "choice-stable",
    ),
  ).toContain("->->");
  expect(() =>
    buildInkCommand(
      "Knot",
      { name: "x\n-> END", label: "", condition: "", create: false },
      [],
      "choice-stable",
    ),
  ).toThrow(/identifier/);
});

it("edits image properties without removing photograph examination or other localized media", () => {
  const scene = original.languages.en!.configuration.scenes!.intro!;
  const input = mediaDefaults("Image", "intro", "intro.illustration", scene);
  input.caption = "An edited photograph";
  input.width = 75;
  const next = applyMediaEdit(
    original,
    "en",
    input,
    ["intro.p1", "intro.p2", "intro.p3", "intro.p4", "intro.clue"],
    "passage",
  );
  const changed = next.languages.en!.configuration.scenes!.intro!.blocks!.find(
    (b) => b.kind === "media",
  );
  expect(changed).toMatchObject({
    caption: "An edited photograph",
    widthPercent: 75,
    photograph: true,
  });
  expect(next.languages.fr).toEqual(original.languages.fr);
  expect(next.languages.en!.configuration.examination).toEqual(
    original.languages.en!.configuration.examination,
  );
});

it("flags a newly added translation, preserves shared images and does not substitute English recordings", async () => {
  const next = addLanguage(original, "en", "es");
  expect(next.languages.en).toEqual(original.languages.en);
  expect(next.languages.es!.configuration.narration).toEqual([]);
  expect(next.languages.es!.missingTranslation).toBe(true);
  await expect(compileLanguage(next, "es")).rejects.toThrow(/translation needs review/);
  expect((await compileLanguage(next, "es", true)).locale).toBe("es");
});

it("checks string-valued logic and stable tags while accepting translated choice labels", () => {
  const en = 'VAR code="red"\nHello\n* [Choose] -> END';
  const fr = 'VAR code="red"\nBonjour\n* [Choisir] -> END';
  expect(structure(en)).toBe(structure(fr));
  expect(structure(en)).not.toBe(structure(fr.replace('"red"', '"blue"')));
  expect(structure(original.languages.en!.script)).not.toBe(
    structure(original.languages.fr!.script.replace("segment:intro.p1", "segment:intro.changed")),
  );
});

it("reports missing media and retries after the resource becomes available", async () => {
  const bundle = {
    ...fixtureBundle(),
    assets: [{ id: "missing", path: "media/missing.webp", type: "image" as const, alt: "" }],
  };
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response(null, { status: 404 }))
    .mockResolvedValue(new Response(null, { status: 200 }));
  await expect(verifyMediaAssets({ en: bundle })).rejects.toThrow(/Missing media/);
  await verifyMediaAssets({ en: bundle });
  await verifyMediaAssets({ en: bundle });
  expect(fetch).toHaveBeenCalledTimes(2);
});

it("bounds an Ink loop during preview and applies test state through the narrative engine", async () => {
  const project = structuredClone(original);
  project.languages.en!.configuration = { title: "Loop", chapter: "Test" };
  project.languages.en!.script =
    "VAR ready = false\n-> start\n=== start ===\n{ready: Ready|Waiting}\n-> END";
  const bundle = await compileLanguage(project, "en");
  expect(new InkNarrativeEngine(bundle, "start", { ready: true }).advance().segments[0]!.text).toBe(
    "Ready",
  );
  project.languages.en!.script = "-> forever\n=== forever ===\n-> forever";
  const looping = await compileLanguage(project, "en");
  expect(() => new InkNarrativeEngine(looping).advance()).toThrow("content");
});
