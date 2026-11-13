import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import { StoryProjectSchema } from "../../contracts/editor-project.ts";
import { insertLocalized } from "./localized-insertion.ts";
import { buildInkCommand } from "./ink-commands.ts";
import { outlineEntries } from "./ink-outline.ts";
import { editMediaScript, mediaReferenceLine, withMediaReferences } from "./media-script.ts";
import { addLanguage } from "./add-language.ts";
import { compileLanguage, structure } from "./compiler.ts";
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
it("keeps unknown command names out of the template object's prototype", () => {
  expect(
    buildInkCommand(
      "constructor",
      { name: "start", label: "", condition: "", create: false },
      [],
      "test",
    ),
  ).toBe("-> start\n");
});
it("ignores example headings in block comments while preserving real outline source rows", () => {
  expect(
    outlineEntries("/*\n=== example ===\n= example_stitch\n*/\n=== start ===\n= first"),
  ).toMatchObject([
    { path: "start", row: 4 },
    { path: "start.first", row: 5 },
  ]);
});
it("compiles mixed Windows line endings and media tags without changing the house story", async () => {
  const annotated = withMediaReferences(original);
  const engine = new InkNarrativeEngine(await compileLanguage(annotated, "en"));
  const baseline = new InkNarrativeEngine(await compileLanguage(original, "en"));
  const { mediaAnchors, ...frame } = engine.advance();
  expect(frame).toEqual(baseline.advance());
  expect(mediaAnchors).toContainEqual({ id: "intro.illustration", after: "intro.p2" });
  engine.choose("intro.call");
  baseline.choose("intro.call");
  expect(engine.advance()).toEqual(baseline.advance());
});

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

it("formats from the script or toolbar, finds from anywhere, and leaves Ctrl+X as Cut", () => {
  const actions = {
    undo: vi.fn(),
    redo: vi.fn(),
    save: vi.fn(async () => {}),
    find: vi.fn(),
    format: vi.fn(),
  };
  const inScript = { closest: (selector: string) => (selector.includes("dialog") ? null : {}) };
  const elsewhere = { closest: () => null };
  const press = (key: string, target: object, extra: object = {}) => {
    const event = {
      key,
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      target: target as unknown as EventTarget,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      ...extra,
    };
    editorShortcut(event, actions);
    return event;
  };
  press("b", inScript);
  press("I", inScript);
  press("u", inScript);
  press("X", inScript, { shiftKey: true });
  press("\\", inScript);
  expect(actions.format.mock.calls.map(([command]) => command)).toEqual([
    "bold",
    "italic",
    "underline",
    "strike",
    "clear",
  ]);
  expect(press("b", inScript).stopPropagation).toHaveBeenCalled(); // Ace's own keys don't run
  const cut = press("x", inScript);
  expect(cut.preventDefault).not.toHaveBeenCalled();
  press("b", elsewhere, { metaKey: true, ctrlKey: false }); // e.g. the header search field
  expect(actions.format).toHaveBeenCalledTimes(6);
  press("f", elsewhere);
  press("h", elsewhere);
  expect(actions.find.mock.calls).toEqual([[false], [true]]);
  press("b", { closest: () => ({}) }); // inside a dialog
  expect(actions.format).toHaveBeenCalledTimes(6);
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
