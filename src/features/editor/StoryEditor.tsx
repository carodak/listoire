import { useRef, useReducer, useEffect } from "react";
import { PanelDivider } from "./PanelDivider.tsx";
import { importProjectArchive } from "./project-archive.ts";
import type { ReactNode } from "react";
import type { StoryProject } from "../../contracts/editor-project.ts";
import type { StoryBundle } from "../../contracts/story.ts";
import { useEditorProject, message } from "./use-editor-project.ts";
import { InkEditor } from "./InkEditor.tsx";
import type { AceEditor, AceRange } from "./ace.ts";
import { Ribbon } from "./Ribbon.tsx";
import type { RibbonTab } from "./Ribbon.tsx";
import { compileInWorker } from "./compile-client.ts";
import { insertLocalized } from "./localized-insertion.ts";
import { verifyMediaAssets } from "./asset-validation.ts";
import { editorShortcut } from "./editor-shortcuts.ts";
import { EditorHeader } from "./EditorHeader.tsx";
import { StoryOutline } from "./StoryOutline.tsx";
import { EditorOverlays } from "./EditorOverlays.tsx";
import { outlineEntries } from "./ink-commands.ts";
import { editMediaScript, mediaReferenceLine, sceneMediaEntries } from "./media-references.ts";
import { useEditorTooltips } from "./tooltips.ts";
import "./editor.css";

interface EditorView {
  locale: string;
  tab: RibbonTab;
  collapsed: boolean;
  dialog: string;
  selectedScene: string;
  selectedPath: string;
  selectedMedia?: string;
  preview: { bundle: StoryBundle; knot: string; key: string } | null;
  busy: boolean;
  leftWidth: number;
  previewWidth: number;
}

export function StoryEditor({
  renderPreview,
}: {
  renderPreview: (
    bundle: StoryBundle,
    project: StoryProject,
    knot: string,
    onClose: () => void,
  ) => ReactNode;
}) {
  const state = useEditorProject();
  const { project, update } = state;
  const initialPreview = useRef(false);
  useEffect(() => {
    if (project && !initialPreview.current) {
      initialPreview.current = true;
      void play();
    }
  });
  useEditorTooltips(Boolean(project));
  const [view, patchView] = useReducer(
    (before: EditorView, change: Partial<EditorView>) => ({ ...before, ...change }),
    {
      leftWidth: 215,
      previewWidth: 480,
      locale: "en",
      tab: "Story",
      collapsed: false,
      dialog: "",
      selectedScene: "intro",
      selectedPath: "intro",
      selectedMedia: undefined,
      preview: null,
      busy: false,
    },
  );
  const { locale, tab, collapsed, dialog, selectedScene, selectedMedia, preview, busy } = view;
  const handles = useRef<{
    editor: AceEditor | null;
    selection: AceRange | null;
    suppress: boolean;
  }>({ editor: null, selection: null, suppress: false }).current;
  const file = useRef<HTMLInputElement>(null);
  if (!project)
    return (
      <main className="editor-loading">
        <h1>Story Editor</h1>
        <p role="status">{state.status}</p>
        <a href="/">Return to reader</a>
      </main>
    );
  const language = project.languages[locale] ?? project.languages[project.defaultLocale]!;
  const activeLocale = project.languages[locale] ? locale : project.defaultLocale;
  const issueLabel = state.issues.length
    ? `${state.issues.length} issue(s)`
    : "✓ No reported issues";
  const currentTab = tab === "Game" && project.gameMode === "narrative" ? "Story" : tab;
  const previewView = preview ? (
    <div className="preview-slot" key={preview.key}>
      {renderPreview(preview.bundle, project, preview.knot, () => patchView({ preview: null }))}
    </div>
  ) : null;

  function changeScript(script: string) {
    if (handles.suppress) return;
    update(
      {
        ...project!,
        languages: { ...project!.languages, [activeLocale]: editMediaScript(language, script) },
      },
      `Edited ${activeLocale} Ink`,
    );
  }
  function insert(text: string, structural = true, base = project!) {
    const instance = handles.editor;
    if (!instance) return;
    if (handles.selection) instance.selection.setRange(handles.selection);
    if (text.startsWith("// @media")) {
      const cursor = instance.getCursorPosition();
      const line = instance.session.getLine(cursor.row);
      if (/^\s*(?:#.*)?$/.test(line.slice(cursor.column)))
        instance.gotoLine(cursor.row + 1, line.length);
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
    handles.suppress = true;
    instance.insert(text);
    handles.suppress = false;
    next.languages[activeLocale]!.script = instance.getValue();
    update(next, "Inserted Ink command");
    handles.selection = null;
    instance.focus();
  }
  function open(command: string) {
    handles.selection = handles.editor?.getSelectionRange() ?? null;
    if (command === "Find" || command === "Replace") {
      handles.editor?.execCommand(command.toLowerCase());
      return;
    }
    if (command === "Compile") {
      void validate();
      return;
    }
    if (command === "Edit Selected Media") {
      const cursor = handles.editor?.getCursorPosition();
      const line = cursor ? handles.editor?.session.getLine(cursor.row) : "";
      const match = line?.match(/@media\s+([^/\s]+)\/([a-z0-9.-]+)/);
      if (!match) {
        state.setIssues([
          "Select a // @media reference or choose an existing media item in the outline.",
        ]);
        patchView({ dialog: "Issues" });
        return;
      }
      patchView({ selectedScene: match[1]! });
      patchView({ selectedMedia: match[2] });
      patchView({
        dialog:
          sceneMediaEntries(language, match[1]!).find((entry) => entry.id === match[2])?.kind ??
          "Scene Properties",
      });
      return;
    }
    patchView({ selectedMedia: undefined });
    patchView({ dialog: command });
  }
  async function validate() {
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
  }
  async function play(knot = "") {
    patchView({ busy: true });
    try {
      const bundles = await compileInWorker(project!, activeLocale);
      await verifyMediaAssets(bundles);
      patchView({ preview: { bundle: bundles[activeLocale]!, knot, key: crypto.randomUUID() } });
    } catch (error) {
      state.setIssues([message(error)]);
      patchView({ dialog: "Issues" });
    } finally {
      patchView({ busy: false });
    }
  }
  function applyLanguage(next: typeof language, label: string) {
    update({ ...project!, languages: { ...project!.languages, [activeLocale]: next } }, label);
  }
  async function importFile(selected: File) {
    try {
      if (selected.size > 200_000_000)
        throw new Error("Project archives must be smaller than 200 MB.");
      const text = await selected.text();
      if (selected.name.toLowerCase().endsWith(".ink")) {
        applyLanguage({ ...language, script: text }, `Imported ${activeLocale} Ink`);
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
  }
  function navigate(name: string) {
    const entry = outlineEntries(language.script).find((e) => e.path === name);
    if (entry) {
      handles.editor?.gotoLine(entry.row + 1);
      patchView({ selectedScene: entry.knot, selectedPath: entry.path });
    }
  }
  function hoverMedia(id: string | null) {
    handles.editor?.highlight(
      id === null ? null : mediaReferenceLine(language.script, selectedScene, id),
    );
  }
  return (
    <div className="story-editor" onKeyDownCapture={(event) => editorShortcut(event, state)}>
      <EditorHeader
        project={project}
        locale={activeLocale}
        state={state}
        onLocale={(value) => patchView({ locale: value })}
        onDialog={(value) => patchView({ dialog: value })}
        busy={busy}
        onPreview={() => {
          void play();
        }}
        onFind={(query, replace) => {
          if (handles.editor?.searchBox) handles.editor.searchBox.searchInput.value = query;
          handles.editor?.searchBox?.show(query, replace);
          handles.editor?.find(query);
        }}
      />
      <Ribbon
        tab={currentTab}
        collapsed={collapsed}
        gameMode={project.gameMode}
        onTab={(value) => patchView({ tab: value })}
        onCollapse={() => patchView({ collapsed: !collapsed })}
        onCommand={open}
        onInsert={insert}
      />
      <div
        className="editor-workspace"
        style={
          {
            "--sidebar-width": `${view.leftWidth}px`,
            "--preview-width": `${view.previewWidth}px`,
          } as React.CSSProperties
        }
      >
        <StoryOutline
          language={language}
          locale={activeLocale}
          locales={Object.keys(project.languages)}
          onLocale={(value) => patchView({ locale: value })}
          selectedScene={selectedScene}
          onNavigate={navigate}
          onDialog={(value) => patchView({ dialog: value })}
          onMedia={(id, kind) => {
            const row = mediaReferenceLine(language.script, selectedScene, id);
            if (row >= 0) handles.editor?.gotoLine(row + 1);
            patchView({ selectedMedia: id });
            patchView({ dialog: kind });
          }}
          onHover={hoverMedia}
        />
        <PanelDivider
          label="Resize navigation"
          value={view.leftWidth}
          onChange={(left) =>
            patchView({
              leftWidth: Math.max(
                120,
                Math.min(
                  left,
                  window.innerWidth * 0.4,
                  window.innerWidth - view.previewWidth - 300,
                ),
              ),
            })
          }
        />
        <section className="editor-script" aria-label="Script workspace">
          <div className="script-tab">
            <strong>
              {project.storyId} / {activeLocale}.ink
            </strong>
            <span>INK SCRIPT</span>
          </div>
          <div className="translation-note" hidden={!language.missingTranslation}>
            Translation needs review. Open Story Settings to mark it reviewed.
          </div>
          <InkEditor
            value={language.script}
            onChange={changeScript}
            onReady={(instance) => {
              handles.editor = instance;
            }}
            onError={(error) => state.setIssues([message(error)])}
            onCursor={(row) => {
              const entry = outlineEntries(language.script)
                .filter((e) => e.row <= row)
                .at(-1);
              if (entry && (entry.path !== view.selectedPath || entry.knot !== selectedScene))
                patchView({ selectedPath: entry.path, selectedScene: entry.knot });
            }}
          />
        </section>
        {previewView && (
          <PanelDivider
            label="Resize preview"
            value={view.previewWidth}
            reverse
            onChange={(preview) =>
              patchView({
                previewWidth: Math.max(
                  260,
                  Math.min(preview, window.innerWidth - view.leftWidth - 300),
                ),
              })
            }
          />
        )}
        {previewView}
      </div>
      <footer className="editor-status">
        <span role="status">{state.status}</span>
        <button onClick={() => patchView({ dialog: "Issues" })}>{issueLabel}</button>
        <span>{activeLocale.toUpperCase()} · UTF-8 · Ink</span>
        <button
          disabled={busy}
          onClick={() => {
            void play(view.selectedPath);
          }}
        >
          Preview from {selectedScene}
        </button>
      </footer>
      <input
        ref={file}
        type="file"
        accept=".ink,.json"
        hidden
        onChange={(event) => {
          const input = event.currentTarget;
          const selected = input.files?.[0];
          if (selected)
            void importFile(selected).finally(() => {
              input.value = "";
            });
        }}
      />
      <EditorOverlays
        context={{
          project,
          locale: activeLocale,
          dialog,
          sceneId: selectedScene,
          selectedMedia,
          state,
          busy,
          onClose: () => patchView({ dialog: "" }),
          onInsert: insert,
          onChooseFile: () => file.current?.click(),
          onLocale: (value) => patchView({ locale: value }),
          onCompile: validate,
        }}
      />
    </div>
  );
}
