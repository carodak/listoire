import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StoryProjectSchema } from "../../contracts/editor-project.ts";
import { insertLocalized } from "./localized-insertion.ts";
import { buildInkCommand } from "./ink-commands.ts";
import { outlineEntries } from "./ink-outline.ts";
import {
  editMediaScript,
  mediaInsertionPosition,
  mediaReferenceLine,
  withMediaReferences,
} from "./media-script.ts";
import { animationOptions } from "./animation-options.ts";
import { applyMediaEdit } from "./media-authoring.ts";
import { mediaDefaults } from "./media-form.ts";
import { addLanguage } from "./add-language.ts";
import { compileLanguage, structure } from "./compiler.ts";
import { verifyMediaAssets } from "./asset-validation.ts";
import { fixtureBundle } from "../../test-fixtures.ts";
import { InkNarrativeEngine } from "../story-runtime/ink-engine.ts";
import { editorShortcut } from "./editor-shortcuts.ts";
import { presentationBlocks } from "../reader/PassageText.tsx";
import { CinematicSchema } from "../../contracts/cinematic.ts";

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

it.each(["inline", "right"] as const)(
  "places %s media at its executed source position, including native untagged paragraphs",
  async (layout) => {
    const project = structuredClone(original);
    project.languages.en!.configuration = {
      title: "Order",
      chapter: "Story",
      assets: original.languages.en!.configuration.assets,
    };
    project.languages.en!.script =
      "-> start\n=== start ===\nFirst sentence.\n// @media start/picture\nSecond sentence.\n-> END";
    const input = mediaDefaults("Image", "start", "picture");
    input.asset = "tcp.human5";
    input.layout = layout;
    const bundle = await compileLanguage(applyMediaEdit(project, "en", input, [], "passage"), "en");
    const frame = new InkNarrativeEngine(bundle).advance();
    expect(frame.mediaAnchors).toEqual([{ id: "picture", after: frame.segments[0]!.id }]);
    expect(
      presentationBlocks(bundle, frame).map((block) =>
        block.kind === "text"
          ? frame.segments.find((s) => s.id === block.segmentId)!.text
          : block.kind,
      ),
    ).toEqual(["First sentence.", "media", "Second sentence.", "choices"]);
    input.motion = CinematicSchema.parse({ preset: "slow-reveal", atmosphere: "historical" });
    input.positionOverride = true;
    input.x = 10;
    input.y = -5;
    const changed = applyMediaEdit(project, "en", input, [], "passage").languages.en!.configuration
      .scenes!.start!;
    expect(changed.blocks).toContainEqual(expect.objectContaining({ position: { x: 10, y: -5 } }));
    expect(
      changed.events?.some(
        (event) => event.action.kind === "effect" && event.action.effect.id === "cinematic-camera",
      ) ?? false,
    ).toBe(false);
  },
);

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
it("adds independent image examination and removes it for a cinematic or an explicit toggle-off", async () => {
  const input = mediaDefaults("Image", "intro", "inspectable");
  input.asset = "tcp.human5";
  input.examination = {
    image: input.asset,
    title: "The drawing",
    buttonLabel: "Look closer",
    descriptions: ["A face.", "A familiar detail."],
    reverse: "Remember.",
  };
  const segments = ["intro.p1", "intro.p2", "intro.p3", "intro.p4", "intro.clue"];
  const added = applyMediaEdit(original, "en", input, segments, "passage");
  const bundle = await compileLanguage(added, "en");
  expect(bundle.scenes!.intro!.blocks).toContainEqual(
    expect.objectContaining({ id: "inspectable", examination: input.examination }),
  );
  expect(added.languages.fr).toEqual(original.languages.fr);
  expect(added.languages.en!.configuration.examination).toEqual(
    original.languages.en!.configuration.examination,
  );
  input.layout = "fullscreen";
  const film = applyMediaEdit(added, "en", input, segments, "passage");
  const cinematic = film.languages.en!.configuration.scenes!.intro!.blocks!.find(
    (block) => block.kind === "media" && block.id === input.id,
  );
  expect(cinematic).not.toHaveProperty("examination", expect.anything());
  input.layout = "inline";
  input.examination = null;
  const disabled = await compileLanguage(
    applyMediaEdit(added, "en", input, segments, "passage"),
    "en",
  );
  expect(
    disabled.scenes!.intro!.blocks!.find(
      (block) => block.kind === "media" && block.id === input.id,
    ),
  ).not.toHaveProperty("examination", expect.anything());
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
    cover: "missing",
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

it("inserts media inside its passage without replacing the selected prose", () => {
  const project = structuredClone(original);
  const script =
    "VAR seen = false\n-> intro\n=== intro ===\n// @media intro/old-art\nA girl waits here. # passage:intro # segment:intro.p1\n-> END";
  project.languages.en!.script = script;
  const position = mediaInsertionPosition(script, "intro", { row: 0, column: 3 });
  expect(position.row).toBe(3);
  const result = insertLocalized(
    project,
    "en",
    "\n// @media intro/new-art\n",
    { start: position, end: position },
    false,
  );
  expect(result.languages.en!.script).toContain(
    "=== intro ===\n// @media intro/old-art\n// @media intro/new-art",
  );
  expect(result.languages.en!.script).toContain("A girl waits here.");
  const selectedProse = mediaInsertionPosition(script, "intro", { row: 4, column: 11 });
  expect(selectedProse.column).toBe(script.split("\n")[4]!.length);
});
it("shares media resources while preserving translated alt text and embedded sounds", () => {
  const project = structuredClone(original);
  const en = project.languages.en!,
    fr = project.languages.fr!;
  const image = en.configuration.assets!.find((asset) => asset.type === "image")!;
  fr.configuration.assets!.find((asset) => asset.id === image.id)!.alt = "Description FR";
  const input = mediaDefaults("Image", "intro", "shared-image");
  Object.assign(input, { asset: image.id, alt: "Updated EN", shared: true });
  const images = applyMediaEdit(project, "en", input, [], "passage");
  expect(
    images.languages.en!.configuration.assets!.find((asset) => asset.id === image.id)!.alt,
  ).toBe("Updated EN");
  expect(
    images.languages.fr!.configuration.assets!.find((asset) => asset.id === image.id)!.alt,
  ).toBe("Description FR");
  en.configuration.assets!.push({
    id: "uploaded-sound",
    type: "audio",
    path: "media/sound.mp3",
    alt: "Sound",
  });
  en.configuration.embeddedAudio = { "uploaded-sound": "data:audio/mpeg;base64,SUQz" };
  const sound = mediaDefaults("Sound Effect", "intro", "shared-sound");
  Object.assign(sound, { asset: "uploaded-sound", shared: true });
  const sounds = applyMediaEdit(project, "en", sound, [], "passage");
  expect(sounds.languages.fr!.configuration.embeddedAudio?.["uploaded-sound"]).toBe(
    en.configuration.embeddedAudio["uploaded-sound"],
  );
  expect(project.languages.fr!.configuration.embeddedAudio?.["uploaded-sound"]).toBeUndefined();
});
it("restores the target image when reopening a sound cue triggered by that image", () => {
  const project = structuredClone(original);
  const asset = project.languages.en!.configuration.assets!.find(
    (asset) => asset.type === "audio",
  )!;
  const input = mediaDefaults("Sound Effect", "intro", "image-sound");
  Object.assign(input, { asset: asset.id, target: "intro-photo" });
  const next = applyMediaEdit(project, "en", input, [], "block");
  const restored = mediaDefaults(
    "Sound Effect",
    "intro",
    input.id,
    next.languages.en!.configuration.scenes!.intro,
  );
  expect(restored.target).toBe(input.target);
});

describe("cutting and pasting a // @media line (REVIEW #3)", () => {
  const annotated = withMediaReferences(original).languages.en!;
  const lines = annotated.script.split("\n");
  const row = mediaReferenceLine(annotated.script, "intro", "intro.illustration");
  const cut = lines.filter((_, index) => index !== row);
  const without = (rows: string[]) => rows.join("\n");
  const media = (language: typeof annotated, scene = "intro") =>
    language.configuration.scenes![scene]!;
  const blockAt = (language: typeof annotated) =>
    media(language).blocks!.findIndex((b) => b.kind === "media" && b.id === "intro.illustration");

  it("restores the image, its cues and its place when the line is pasted back", () => {
    const kept = new Map();
    const removed = editMediaScript(annotated, without(cut), kept);
    expect(blockAt(removed)).toBe(-1);
    expect(media(removed).events!.some((e) => e.blockId === "intro.illustration")).toBe(false);
    const pasted = [...cut];
    pasted.splice(row, 0, lines[row]!);
    const restored = editMediaScript(removed, without(pasted), kept);
    expect(media(restored)).toEqual(media(annotated));
    expect(restored.script).toBe(annotated.script);
    expect(kept.size).toBe(0);
  });

  it("puts the image after the text the pasted line now follows", () => {
    const kept = new Map();
    const removed = editMediaScript(annotated, without(cut), kept);
    const text = media(annotated).blocks!.filter((b) => b.kind === "text");
    const last = text.at(-1)!;
    const target = cut.findIndex(
      (line) => last.kind === "text" && line.includes(`# segment:${last.segmentId}`),
    );
    const pasted = [...cut];
    pasted.splice(target + 1, 0, lines[row]!);
    const restored = editMediaScript(removed, without(pasted), kept);
    const blocks = media(restored).blocks!;
    expect(blocks[blockAt(restored) - 1]).toEqual(last);
    expect(media(restored).events).toEqual(expect.arrayContaining(media(annotated).events!));
  });

  it("keeps the image in its own scene when the line is pasted into another passage", () => {
    const kept = new Map();
    const removed = editMediaScript(annotated, without(cut), kept);
    const room = cut.findIndex((line) => line.startsWith("=== room"));
    const pasted = [...cut];
    pasted.splice(room + 1, 0, lines[row]!);
    const restored = editMediaScript(removed, without(pasted), kept);
    expect(blockAt(restored)).toBe(blockAt(annotated));
    expect(media(restored, "room")).toEqual(media(annotated, "room"));
  });

  it("a deleted line that never comes back stays deleted; two lines cut together both return", () => {
    const kept = new Map();
    const second = mediaReferenceLine(annotated.script, "room", "room.illustration");
    const both = lines.filter((_, index) => index !== row && index !== second);
    const removed = editMediaScript(annotated, without(both), kept);
    expect(kept.size).toBe(2);
    // (The cut also dropped the cue lines aimed at these images; editing on keeps them gone.)
    expect(editMediaScript(removed, removed.script, kept)).toEqual(removed);
    const restored = editMediaScript(removed, annotated.script, kept);
    expect(media(restored)).toEqual(media(annotated));
    expect(media(restored, "room")).toEqual(media(annotated, "room"));
    // Without the session's buffer (a reload), a pasted line stays a dead comment, as before.
    const reloaded = editMediaScript(removed, annotated.script);
    expect(blockAt(reloaded)).toBe(-1);
  });
});
