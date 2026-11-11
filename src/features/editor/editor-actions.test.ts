import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { houseProject } from "../../../tests/fixtures/house-project.ts";
import type { AceEditor } from "./ace.ts";
import { compileInWorker } from "./compile-client.ts";
import { EditorActions } from "./editor-actions.ts";
import type { EditorActionContext } from "./editor-actions.ts";
import type { EditorView } from "./editor-view.ts";
import type { StoryBundle } from "../../contracts/story.ts";

vi.mock("./compile-client.ts", () => ({ compileInWorker: vi.fn() }));
const compile = vi.mocked(compileInWorker);

const script = "=== garden ===\nRoses.\n= gate\nIron.\n=== house ===\n// @media house/lamp\n";

/** Just the Ace surface EditorActions uses, with one cursor/selection. */
function fakeEditor(lines = script.split("\n"), range = { start: 0, end: 0 }) {
  return {
    getSelectionRange: () => ({
      start: { row: range.start, column: 0 },
      end: { row: range.end, column: 2 },
    }),
    getCursorPosition: () => ({ row: range.start, column: 0 }),
    session: { getLine: (row: number) => lines[row] ?? "" },
    execCommand: vi.fn(),
    gotoLine: vi.fn(),
  };
}

function setup(editor: ReturnType<typeof fakeEditor> | null = fakeEditor()) {
  const project = structuredClone(houseProject);
  const language = { ...project.languages.en!, script };
  project.languages.en = language;
  const patchView = vi.fn<EditorActionContext["patchView"]>();
  const update = vi.fn();
  const setIssues = vi.fn();
  const context: EditorActionContext = {
    project,
    language,
    activeLocale: "en",
    selectedScene: "garden",
    handles: {
      current: { editor: editor as unknown as AceEditor, selection: null, suppress: false },
    },
    state: { setIssues } as unknown as EditorActionContext["state"],
    update,
    view: { selectedPath: "garden" } as EditorView,
    patchView,
  };
  return { actions: new EditorActions(context), context, patchView, update, setIssues };
}
const file = (name: string, text: string, size = text.length) =>
  ({ name, size, text: async () => text }) as File;

beforeEach(() => {
  compile.mockReset();
});

describe("EditorActions.importFile", () => {
  it("rejects archives over 200 MB without reading them", async () => {
    const { actions, update, setIssues, patchView } = setup();
    const huge = file("backup.json", "{}", 200_000_001);
    const read = vi.spyOn(huge, "text");
    await actions.importFile(huge);
    expect(read).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(setIssues).toHaveBeenCalledWith(["Project archives must be smaller than 200 MB."]);
    expect(patchView).toHaveBeenCalledWith({ dialog: "Issues" });
  });

  it.each([
    ["malformed JSON", "{ not json"],
    ["JSON that is not a project backup", '{"storyId": "elsewhere"}'],
  ])("reports %s as an issue and keeps the project", async (_, text) => {
    const { actions, update, setIssues, patchView } = setup();
    await actions.importFile(file("backup.json", text));
    expect(update).not.toHaveBeenCalled();
    expect(setIssues).toHaveBeenCalledOnce();
    expect(patchView).toHaveBeenLastCalledWith({ dialog: "Issues" });
  });

  it("replaces only the active language script from an .ink file", async () => {
    const { actions, update, patchView, context } = setup();
    await actions.importFile(file("Chapter.INK", "=== start ===\nHello.\n"));
    const [next, label] = update.mock.calls[0]!;
    expect(label).toBe("Imported en Ink");
    expect(next.languages.en.script).toBe("=== start ===\nHello.\n");
    expect(next.languages.fr).toBe(context.project.languages.fr);
    expect(patchView).toHaveBeenLastCalledWith({ dialog: "" });
  });
});

describe("EditorActions compile actions", () => {
  it("validate clears issues on success and always ends busy", async () => {
    compile.mockResolvedValue({});
    const { actions, setIssues, patchView } = setup();
    await actions.validate();
    expect(setIssues).toHaveBeenCalledWith([]);
    expect(patchView.mock.calls.map(([view]) => view)).toEqual([
      { busy: true },
      { dialog: "Issues" },
      { busy: false },
    ]);
  });

  it("validate and play report compiler errors and still end busy", async () => {
    compile.mockRejectedValue(new Error("Missing knot: cellar"));
    const { actions, setIssues, patchView } = setup();
    await actions.validate();
    await actions.play("garden");
    expect(setIssues.mock.calls).toEqual([[["Missing knot: cellar"]], [["Missing knot: cellar"]]]);
    expect(patchView).toHaveBeenLastCalledWith({ busy: false });
    expect(patchView).not.toHaveBeenCalledWith(
      expect.objectContaining({ preview: expect.anything() }),
    );
  });

  it("play previews the active locale's bundle from the requested knot", async () => {
    const bundle = { locale: "en" };
    compile.mockResolvedValue({ en: bundle } as never);
    const { actions, patchView, context } = setup();
    await actions.play("garden");
    expect(compile).toHaveBeenCalledWith(context.project, "en");
    expect(patchView).toHaveBeenCalledWith({
      preview: { bundle, knot: "garden", key: expect.any(String) },
    });
  });
});

describe("EditorActions editor commands", () => {
  it("applyPreset explains why it cannot format yet", () => {
    // Pass 9, 1b: the messages are i18n keys now (the toolbar translates them).
    expect(setup(null).actions.applyPreset("whisper")).toBe("editor.text.errors.loading");
    const multiline = fakeEditor(undefined, { start: 0, end: 1 });
    expect(setup(multiline).actions.applyPreset("whisper")).toBe("editor.text.errors.oneParagraph");
  });

  it("reports a formatting message to every listener until it is cleared", () => {
    const { actions } = setup();
    const toolbar = vi.fn(),
      statusBar = vi.fn();
    const stop = actions.watchSelection(toolbar);
    actions.watchSelection(statusBar);
    actions.report(actions.toggleText("bold"));
    expect(actions.textStatus()).toBe("editor.text.errors.notNarrative");
    expect(toolbar).toHaveBeenCalledTimes(1);
    expect(statusBar).toHaveBeenCalledTimes(1);
    stop();
    actions.report(undefined);
    expect(actions.textStatus()).toBe("");
    expect(toolbar).toHaveBeenCalledTimes(1);
    expect(statusBar).toHaveBeenCalledTimes(2);
  });

  it("changeScript ignores edits made by the editor itself", () => {
    const { actions, context, update } = setup();
    context.handles.current.suppress = true;
    actions.changeScript("changed");
    expect(update).not.toHaveBeenCalled();
  });

  it("Find and Replace run the editor command instead of opening a dialog", () => {
    const editor = fakeEditor();
    const { actions, patchView } = setup(editor);
    actions.open("Find");
    actions.open("Replace");
    expect(editor.execCommand.mock.calls).toEqual([["find"], ["replace"]]);
    expect(patchView).not.toHaveBeenCalled();
  });

  it("Edit Selected Media asks for a media line when the cursor is elsewhere", () => {
    const { actions, setIssues, patchView } = setup(fakeEditor(undefined, { start: 1, end: 1 }));
    actions.open("Edit Selected Media");
    expect(setIssues).toHaveBeenCalledWith([
      "Select a // @media reference or choose an existing media item in the outline.",
    ]);
    expect(patchView).toHaveBeenLastCalledWith({ dialog: "Issues" });
  });

  it("Edit Selected Media falls back to scene properties for unknown media", () => {
    const { actions, patchView } = setup(fakeEditor(undefined, { start: 5, end: 5 }));
    actions.open("Edit Selected Media");
    expect(patchView).toHaveBeenLastCalledWith({
      selectedScene: "house",
      selectedMedia: "lamp",
      dialog: "Scene Properties",
    });
  });

  it("cursor selects the nearest outline entry above and skips no-op updates", () => {
    const { actions, patchView } = setup();
    actions.cursor(3);
    expect(patchView).toHaveBeenCalledWith({
      selectedPath: "garden.gate",
      selectedScene: "garden",
    });
    patchView.mockClear();
    actions.cursor(1);
    expect(patchView).not.toHaveBeenCalled();
  });
});

it("open() clears the selected media and opens the dialog in one view update", () => {
  const { actions, patchView } = setup();
  actions.open("Story Settings");
  expect(patchView.mock.calls).toEqual([[{ selectedMedia: undefined, dialog: "Story Settings" }]]);
});

describe("EditorActions.refresh (live preview)", () => {
  const bundle = { locale: "en" } as unknown as StoryBundle;
  const live = () => {
    const parts = setup();
    Object.assign(parts.context.state, { issues: [] });
    parts.context.view.preview = open();
    return parts;
  };
  const open = (key = "slot") => ({ bundle, knot: "", key });
  const applied = (patchView: ReturnType<typeof setup>["patchView"], view: Partial<EditorView>) =>
    patchView.mock.calls.map(([change]) =>
      typeof change === "function" ? change(view as EditorView) : change,
    );

  it("shows the passage at the cursor, settled, in the same preview; never reopens a closed one", async () => {
    const { actions, patchView } = live();
    compile.mockResolvedValue({ en: bundle });
    await actions.refresh();
    expect(applied(patchView, { preview: open() })).toEqual([
      { preview: { bundle, knot: "garden", key: "slot", settled: true } },
    ]);
    expect(applied(patchView, { preview: null })).toEqual([{}]);
  });

  it("skips a version Preview already shows and drops a compile that a newer one replaced", async () => {
    const { actions, context, patchView } = live();
    compile.mockResolvedValue({ en: bundle });
    await actions.play();
    patchView.mockClear();
    await actions.refresh(); // same project as the Preview just played
    expect(compile).toHaveBeenCalledOnce();
    context.project = structuredClone(context.project);
    let finish!: (value: Record<string, StoryBundle>) => void;
    compile.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const late = actions.refresh();
    context.project = structuredClone(context.project);
    await actions.refresh();
    finish({ en: bundle });
    await late;
    expect(patchView).toHaveBeenCalledOnce();
  });

  it("keeps the last preview and reports a compile error without opening Issues", async () => {
    const { actions, patchView, setIssues } = live();
    compile.mockRejectedValue(new Error("Unknown divert"));
    await actions.refresh();
    expect(setIssues).toHaveBeenCalledWith(["Unknown divert"]);
    expect(patchView).not.toHaveBeenCalled();
  });
});
