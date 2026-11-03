import { useRef, useReducer } from "react";
import type { ReactNode } from "react";
import { StoryProjectSchema } from "../../contracts/editor-project.ts";
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
import { editMediaScript, mediaReferenceLine } from "./media-references.ts";
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
  useEditorTooltips(Boolean(project));
  const [view, patchView] = useReducer(
    (before: EditorView, change: Partial<EditorView>) => ({ ...before, ...change }),
    {
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
  const editor = useRef<AceEditor | null>(null);
  const selection = useRef<AceRange | null>(null);
  const suppress = useRef(false);
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
    if (suppress.current) return;
    update(
      {
        ...project!,
        languages: { ...project!.languages, [activeLocale]: editMediaScript(language, script) },
      },
      `Edited ${activeLocale} Ink`,
    );
  }
  function insert(text: string, structural = true, base = project!) {
    const instance = editor.current;
    if (!instance) return;
    if (selection.current) instance.selection.setRange(selection.current);
    const range = instance.getSelectionRange();
    let next: StoryProject;
    try {
      next = insertLocalized(base, activeLocale, text, range, structural);
    } catch (error) {
      state.setIssues([message(error)]);
      patchView({ dialog: "Issues" });
      return;
    }
    suppress.current = true;
    instance.insert(text);
    suppress.current = false;
    next.languages[activeLocale]!.script = instance.getValue();
    update(next, "Inserted Ink command");
    selection.current = null;
    instance.focus();
  }
  function open(command: string) {
    selection.current = editor.current?.getSelectionRange() ?? null;
    if (command === "Find" || command === "Replace") {
      editor.current?.execCommand(command.toLowerCase());
      return;
    }
    if (command === "Compile") {
      void validate();
      return;
    }
    if (command === "Edit Selected Media") {
      const cursor = editor.current?.getCursorPosition();
      const line = cursor ? editor.current?.session.getLine(cursor.row) : "";
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
      const scene = language.configuration.scenes?.[match[1]!];
      patchView({
        dialog: scene?.blocks?.some((b) => b.kind === "media" && b.id === match[2])
          ? "Image"
          : scene?.events?.find((e) => e.id === match[2])?.action.kind === "effect"
            ? "Animation"
            : "Sound Effect",
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
      if (selected.size > 8_000_000) throw new Error("Project files must be smaller than 8 MB.");
      const text = await selected.text();
      if (selected.name.toLowerCase().endsWith(".ink")) {
        applyLanguage({ ...language, script: text }, `Imported ${activeLocale} Ink`);
      } else {
        const imported = StoryProjectSchema.parse(JSON.parse(text));
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
      editor.current?.gotoLine(entry.row + 1);
      patchView({ selectedScene: entry.knot, selectedPath: entry.path });
    }
  }
  function hoverMedia(id: string | null) {
    editor.current?.highlight(
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
          editor.current?.execCommand(replace ? "replace" : "find");
          editor.current?.searchBox?.show(query, replace);
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
      <div className="editor-workspace">
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
            if (row >= 0) editor.current?.gotoLine(row + 1);
            patchView({ selectedMedia: id });
            patchView({ dialog: kind });
          }}
          onHover={hoverMedia}
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
              editor.current = instance;
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
          const selected = event.target.files?.[0];
          if (selected) void importFile(selected);
          event.target.value = "";
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
