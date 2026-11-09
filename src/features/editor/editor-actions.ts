import type { RefObject } from "react";
import type { StoryProject } from "../../contracts/editor-project.ts";
import type { AceEditor, AceRange } from "./ace.ts";
import type { EditorView } from "./editor-view.ts";
import type { useEditorProject } from "./use-editor-project.ts";
import { message } from "./use-editor-project.ts";
import { importProjectArchive } from "./project-archive.ts";
import { compileInWorker } from "./compile-client.ts";
import { insertLocalized } from "./localized-insertion.ts";
import { outlineEntries } from "./ink-outline.ts";
import { editMediaScript, mediaInsertionPosition, mediaReferenceLine } from "./media-script.ts";
import { sceneMediaEntries } from "./scene-media.ts";
import type { Typography } from "../../contracts/typography.ts";
import { parseTypography } from "../../contracts/typography.ts";
import { formatTextSelection } from "./text-formatting.ts";
export interface EditorActionContext {
  project: StoryProject;
  language: StoryProject["languages"][string];
  activeLocale: string;
  selectedScene: string;
  handles: RefObject<{ editor: AceEditor | null; selection: AceRange | null; suppress: boolean }>;
  state: ReturnType<typeof useEditorProject>;
  update: ReturnType<typeof useEditorProject>["update"];
  view: EditorView;
  patchView: (view: Partial<EditorView>) => void;
}
export class EditorActions {
  private readonly context: EditorActionContext;
  constructor(context: EditorActionContext) {
    this.context = context;
  }
  selectedText = () => {
    try {
      return parseTypography(this.context.handles.current.editor?.getSelectedText() ?? "").text;
    } catch {
      return "";
    }
  };
  formatText = (format: Typography): string | undefined => {
    const { handles } = this.context;
    const editor = handles.current.editor;
    if (!editor) return "The script editor is still loading.";
    const range = editor.getSelectionRange();
    if (range.start.row !== range.end.row) return "Select words within one paragraph.";
    try {
      const { start, end, replacement, selection } = formatTextSelection(
        editor.session.getLine(range.start.row),
        range.start.column,
        range.end.column,
        format,
      );
      handles.current.selection = {
        start: { row: range.start.row, column: start },
        end: { row: range.end.row, column: end },
      };
      this.insert(replacement, false);
      editor.selection.setRange({
        start: { row: range.start.row, column: selection.start },
        end: { row: range.start.row, column: selection.end },
      });
    } catch (error) {
      return message(error);
    }
  };
  changeScript = (script: string) => {
    const { handles, update, project, activeLocale, language } = this.context;
    if (handles.current.suppress) return;
    update(
      {
        ...project!,
        languages: { ...project!.languages, [activeLocale]: editMediaScript(language, script) },
      },
      `Edited ${activeLocale} Ink`,
    );
  };
  insert = (text: string, structural = true, base = this.context.project) => {
    const { handles, selectedScene, activeLocale, state, patchView, update } = this.context;
    const instance = handles.current.editor;
    if (!instance) return;
    if (handles.current.selection) instance.selection.setRange(handles.current.selection);
    if (text.startsWith("// @media")) {
      const sceneId = text.match(/@media ([^/]+)\//)?.[1] ?? selectedScene;
      const position = mediaInsertionPosition(
        instance.getValue(),
        sceneId,
        instance.getSelectionRange().end,
      );
      instance.gotoLine(position.row + 1, position.column);
      text = `\n${text}`;
    }
    const range = instance.getSelectionRange();
    let next: StoryProject;
    try {
      next = insertLocalized(base, activeLocale, text, range, structural);
    } catch (error) {
      state.setIssues([message(error)]);
      patchView({ dialog: "Issues" });
      return;
    }
    handles.current.suppress = true;
    instance.insert(text);
    handles.current.suppress = false;
    next.languages[activeLocale]!.script = instance.getValue();
    update(next, "Inserted Ink command");
    handles.current.selection = null;
    instance.focus();
  };
  open = (command: string) => {
    const { handles, patchView } = this.context;
    handles.current.selection = handles.current.editor?.getSelectionRange() ?? null;
    if (command === "Find" || command === "Replace") {
      handles.current.editor?.execCommand(command.toLowerCase());
      return;
    }
    if (command === "Compile") {
      void this.validate();
      return;
    }
    if (command === "Edit Selected Media") {
      this.editSelectedMedia();
      return;
    }
    patchView({ selectedMedia: undefined, dialog: command });
  };
  private editSelectedMedia() {
    const { handles, language, state, patchView } = this.context;
    const cursor = handles.current.editor?.getCursorPosition();
    const line = handles.current.editor?.session.getLine(cursor?.row ?? 0);
    const match = line?.match(/@media\s+([^/\s]+)\/([a-z0-9.-]+)/);
    if (!match) {
      state.setIssues([
        "Select a // @media reference or choose an existing media item in the outline.",
      ]);
      patchView({ dialog: "Issues" });
      return;
    }
    patchView({
      selectedScene: match[1]!,
      selectedMedia: match[2],
      dialog:
        sceneMediaEntries(language, match[1]!).find((entry) => entry.id === match[2])?.kind ??
        "Scene Properties",
    });
  }
  validate = async () => {
    const { patchView, project, state } = this.context;
    patchView({ busy: true });
    try {
      await compileInWorker(project!);
      state.setIssues([]);
      patchView({ dialog: "Issues" });
    } catch (error) {
      state.setIssues([message(error)]);
      patchView({ dialog: "Issues" });
    } finally {
      patchView({ busy: false });
    }
  };
  play = async (knot = "", source = this.context.project) => {
    const { patchView, activeLocale, state } = this.context;
    patchView({ busy: true });
    try {
      const bundles = await compileInWorker(source, activeLocale);
      patchView({ preview: { bundle: bundles[activeLocale]!, knot, key: crypto.randomUUID() } });
    } catch (error) {
      state.setIssues([message(error)]);
      patchView({ dialog: "Issues" });
    } finally {
      patchView({ busy: false });
    }
  };
  applyLanguage = (next: EditorActionContext["language"], label: string) => {
    const { update, project, activeLocale } = this.context;
    update({ ...project!, languages: { ...project!.languages, [activeLocale]: next } }, label);
  };
  importFile = async (selected: File) => {
    const { activeLocale, language, update, patchView, state } = this.context;
    try {
      if (selected.size > 200_000_000)
        throw new Error("Project archives must be smaller than 200 MB.");
      const text = await selected.text();
      if (selected.name.toLowerCase().endsWith(".ink")) {
        this.applyLanguage({ ...language, script: text }, `Imported ${activeLocale} Ink`);
      } else {
        const imported = await importProjectArchive(JSON.parse(text));
        update(imported, "Restored project backup");
        patchView({ locale: imported.defaultLocale });
      }
      patchView({ dialog: "" });
    } catch (error) {
      state.setIssues([message(error)]);
      patchView({ dialog: "Issues" });
    }
  };
  navigate = (name: string) => {
    const { language, handles, patchView } = this.context;
    const entry = outlineEntries(language.script).find((e) => e.path === name);
    if (entry) {
      handles.current.editor?.gotoLine(entry.row + 1);
      patchView({ selectedScene: entry.knot, selectedPath: entry.path });
    }
  };
  hoverMedia = (id: string | null) => {
    const { handles, language, selectedScene } = this.context;
    handles.current.editor?.highlight(
      id === null ? null : mediaReferenceLine(language.script, selectedScene, id),
    );
  };
  find = (query: string, replace: boolean) => {
    const editor = this.context.handles.current.editor;
    if (editor?.searchBox) editor.searchBox.searchInput.value = query;
    editor?.searchBox?.show(query, replace);
    editor?.find(query);
  };
  ready = (editor: AceEditor) => {
    this.context.handles.current.editor = editor;
  };
  error = (error: unknown) => this.context.state.setIssues([message(error)]);
  cursor = (row: number) => {
    const { language, view, selectedScene, patchView } = this.context;
    const entry = outlineEntries(language.script)
      .filter((entry) => entry.row <= row)
      .at(-1);
    if (entry && (entry.path !== view.selectedPath || entry.knot !== selectedScene))
      patchView({ selectedPath: entry.path, selectedScene: entry.knot });
  };
  editMedia = (id: string, kind: string) => {
    const { language, selectedScene, handles, patchView } = this.context;
    const row = mediaReferenceLine(language.script, selectedScene, id);
    if (row >= 0) handles.current.editor?.gotoLine(row + 1);
    patchView({ selectedMedia: id, dialog: kind });
  };
}
