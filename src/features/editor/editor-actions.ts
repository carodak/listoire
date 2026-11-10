import type { RefObject } from "react";
import type { StoryProject } from "../../contracts/editor-project.ts";
import type { AceEditor, AcePosition, AceRange } from "./ace.ts";
import type { EditorView } from "./editor-view.ts";
import type { useEditorProject } from "./use-editor-project.ts";
import { message } from "../../contracts/error-message.ts";
import { importProjectArchive } from "./project-archive.ts";
import { compileInWorker } from "./compile-client.ts";
import { insertLocalized } from "./localized-insertion.ts";
import { outlineEntries } from "./ink-outline.ts";
import { editMediaScript, mediaInsertionPosition, mediaReferenceLine } from "./media-script.ts";
import { sceneMediaEntries } from "./scene-media.ts";
import type { ParagraphAlign, Typography } from "../../contracts/typography.ts";
import { effectiveTypography } from "../../contracts/typography.ts";
import {
  alignLine,
  alignTranslations,
  formatAt,
  formatTextSelection,
  isParagraphLine,
  lineAlignment,
  patchTextSelection,
} from "./text-formatting.ts";
export type TextToggle = "bold" | "italic" | "underline" | "strike";
export interface SelectionFormat {
  format: Typography;
  align: ParagraphAlign;
}
type Handles = {
  editor: AceEditor | null;
  selection: AceRange | null;
  suppress: boolean;
  onSelection?: () => void;
  /** Counts preview compiles, so a late one never replaces a newer preview. */
  compiles?: number;
  /** The last live-preview compile error, cleared once the script compiles again. */
  liveIssue?: string;
  /** The project version the preview was compiled from: no refresh needed for it. */
  previewed?: StoryProject;
};
export interface EditorActionContext {
  project: StoryProject;
  language: StoryProject["languages"][string];
  activeLocale: string;
  selectedScene: string;
  handles: RefObject<Handles>;
  state: ReturnType<typeof useEditorProject>;
  update: ReturnType<typeof useEditorProject>["update"];
  view: EditorView;
  patchView: (view: Partial<EditorView> | ((view: EditorView) => Partial<EditorView>)) => void;
}
export class EditorActions {
  private readonly context: EditorActionContext;
  constructor(context: EditorActionContext) {
    this.context = context;
  }
  /** What the toolbar shows: the settings at the selection (or the caret) and its paragraph. */
  selectionFormat = (): SelectionFormat => {
    const editor = this.context.handles.current.editor;
    if (!editor) return { format: {}, align: "left" };
    const { start, end } = editor.getSelectionRange();
    const line = editor.session.getLine(start.row);
    const caret = start.row === end.row && start.column === end.column;
    // At a caret, the letter before it (the word being edited, as in other editors).
    return {
      format: formatAt(line, caret ? Math.max(0, start.column - 1) : start.column),
      align: lineAlignment(line),
    };
  };
  watchSelection = (listener: () => void) => {
    const { handles } = this.context;
    handles.current.onSelection = listener;
    return () => {
      if (handles.current.onSelection === listener) handles.current.onSelection = undefined;
    };
  };
  /** A preset gives exactly its look: manual changes on these words are cleared (undo restores). */
  applyPreset = (style: NonNullable<Typography["style"]>) =>
    this.rewrite("style", (line, start, end) => formatTextSelection(line, start, end, { style }));
  patchText = (patch: Omit<Typography, "style">) =>
    this.rewrite(Object.keys(patch).join(), (line, start, end) =>
      patchTextSelection(line, start, end, patch),
    );
  clearText = () =>
    this.rewrite("clear", (line, start, end) => formatTextSelection(line, start, end, {}));
  toggleText = (key: TextToggle) =>
    this.patchText({
      [key]: effectiveTypography(this.selectionFormat().format)[key] === "on" ? "off" : "on",
    });
  /** Rewrites the selected words in place; a caret first selects the word under it. */
  private rewrite(
    change: string,
    edit: (line: string, start: number, end: number) => ReturnType<typeof formatTextSelection>,
  ): string | undefined {
    const { handles } = this.context;
    const editor = handles.current.editor;
    if (!editor) return "The script editor is still loading.";
    const caret = editor.getSelectionRange();
    if (caret.start.row === caret.end.row && caret.start.column === caret.end.column)
      editor.selection.selectWord();
    const range = editor.getSelectionRange();
    if (range.start.row !== range.end.row) return "Select words within one paragraph.";
    try {
      const { start, end, replacement, selection } = edit(
        editor.session.getLine(range.start.row),
        range.start.column,
        range.end.column,
      );
      handles.current.selection = {
        start: { row: range.start.row, column: start },
        end: { row: range.end.row, column: end },
      };
      this.insert(replacement, false, undefined, `Formatted text: ${change}`);
      editor.selection.setRange({
        start: { row: range.start.row, column: selection.start },
        end: { row: range.start.row, column: selection.end },
      });
    } catch (error) {
      return message(error);
    }
  }
  /** Aligns every paragraph the selection touches, here and in the other translations. */
  alignText = (align: ParagraphAlign): string | undefined => {
    const { handles, project, activeLocale } = this.context;
    const editor = handles.current.editor;
    if (!editor) return "The script editor is still loading.";
    const range = editor.getSelectionRange();
    const last =
      range.end.row > range.start.row && range.end.column === 0 ? range.end.row - 1 : range.end.row;
    const lines: string[] = [];
    for (let row = range.start.row; row <= last; row++) lines.push(editor.session.getLine(row));
    if (!lines.some(isParagraphLine)) return "editor.text.errors.noParagraph";
    const aligned = lines.map((line) => alignLine(line, align));
    handles.current.selection = {
      start: { row: range.start.row, column: 0 },
      end: { row: last, column: lines.at(-1)!.length },
    };
    const translated = alignTranslations(project, activeLocale, lines, align);
    this.insert(aligned.join("\n"), false, translated, "Aligned paragraphs");
    const clip = (position: AcePosition) => ({
      row: position.row,
      column: Math.min(position.column, editor.session.getLine(position.row).length),
    });
    editor.selection.setRange({ start: clip(range.start), end: clip(range.end) });
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
  insert = (
    text: string,
    structural = true,
    base = this.context.project,
    // Same-label changes within 750 ms share one undo step (typing); formatting has its own.
    label = "Inserted Ink command",
  ) => {
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
    update(next, label);
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
    const { patchView, activeLocale, state, handles } = this.context;
    patchView({ busy: true });
    const compile = (handles.current.compiles = (handles.current.compiles ?? 0) + 1);
    handles.current.previewed = source;
    try {
      const bundles = await compileInWorker(source, activeLocale);
      if (handles.current.compiles !== compile) return;
      patchView({ preview: { bundle: bundles[activeLocale]!, knot, key: crypto.randomUUID() } });
    } catch (error) {
      state.setIssues([message(error)]);
      patchView({ dialog: "Issues" });
    } finally {
      patchView({ busy: false });
    }
  };
  /** Live preview after an edit: the passage at the cursor, in its final state. */
  refresh = async () => {
    const { handles, patchView, activeLocale, state, project, language, view } = this.context;
    // ▷ Preview may already show this version (it then keeps its full playback).
    if (!view.preview || handles.current.previewed === project) return;
    const compile = (handles.current.compiles = (handles.current.compiles ?? 0) + 1);
    handles.current.previewed = project;
    const row = handles.current.editor?.getCursorPosition().row ?? 0;
    const knot =
      outlineEntries(language.script)
        .filter((entry) => entry.row <= row)
        .at(-1)?.path ?? "";
    try {
      const bundle = (await compileInWorker(project, activeLocale))[activeLocale]!;
      if (handles.current.compiles !== compile) return;
      if (state.issues.length === 1 && state.issues[0] === handles.current.liveIssue)
        state.setIssues([]);
      // Never reopens a preview closed meanwhile; keeps its key, so it isn't rebuilt.
      patchView((current) =>
        current.preview
          ? { preview: { bundle, knot, key: current.preview.key, settled: true } }
          : {},
      );
    } catch (error) {
      if (handles.current.compiles !== compile) return;
      handles.current.liveIssue = message(error);
      state.setIssues([handles.current.liveIssue]);
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
    this.context.handles.current.onSelection?.();
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
