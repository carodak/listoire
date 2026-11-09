import { useRef, useReducer, useEffect } from "react";
import { uploadChosenFile } from "./Fields.tsx";
import type { ReactNode } from "react";
import type { StoryBundle } from "../../contracts/story.ts";
import type { StoryProject } from "../../contracts/editor-project.ts";
import type { AceEditor, AceRange } from "./ace.ts";
import type { EditorView } from "./editor-view.ts";
import { EditorActions } from "./editor-actions.ts";
import type { EditorActionContext } from "./editor-actions.ts";
import { useEditorProject } from "./use-editor-project.ts";
import { useEditorTooltips } from "./tooltips.ts";
import { editorShortcut } from "./editor-shortcuts.ts";
import { EditorHeader } from "./EditorHeader.tsx";
import { Ribbon } from "./Ribbon.tsx";
import { EditorWorkspace } from "./EditorWorkspace.tsx";
import { TextToolbar } from "./TextToolbar.tsx";
import "./editor.css";
interface StoryEditorProps {
  renderPreview: (
    bundle: StoryBundle,
    project: StoryProject,
    knot: string,
    onClose: () => void,
  ) => ReactNode;
}

const initialView: EditorView = {
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
};
export function StoryEditor({ renderPreview }: StoryEditorProps) {
  const state = useEditorProject();
  return state.project ? (
    <LoadedEditor state={state} project={state.project} renderPreview={renderPreview} />
  ) : (
    <main className="editor-loading">
      <h1>Story Editor</h1>
      <p role="status">{state.status}</p>
      <a href="/">Return to reader</a>
    </main>
  );
}
interface LoadedProps extends StoryEditorProps {
  state: ReturnType<typeof useEditorProject>;
  project: StoryProject;
}
function LoadedEditor({ state, project, renderPreview }: LoadedProps) {
  const [view, patchView] = useReducer(
    (before: EditorView, change: Partial<EditorView>) => ({ ...before, ...change }),
    initialView,
  );
  const handles = useRef<{
    editor: AceEditor | null;
    selection: AceRange | null;
    suppress: boolean;
  }>({ editor: null, selection: null, suppress: false });
  const activeLocale = project.languages[view.locale] ? view.locale : project.defaultLocale;
  const language = project.languages[activeLocale]!;
  const context: EditorActionContext = {
    project,
    language,
    activeLocale,
    selectedScene: view.selectedScene,
    handles,
    state,
    update: state.update,
    view,
    patchView,
  };
  const actions = new EditorActions(context);
  const initialPreview = useRef(false);
  useEffect(() => {
    if (!initialPreview.current) {
      initialPreview.current = true;
      void actions.play();
    }
  });
  useEditorTooltips(true);
  const preview = view.preview ? (
    <div className="preview-slot" key={view.preview.key}>
      {renderPreview(view.preview.bundle, project, view.preview.knot, () =>
        patchView({ preview: null }),
      )}
    </div>
  ) : null;
  return <EditorShell context={context} actions={actions} preview={preview} />;
}
interface ShellProps {
  context: EditorActionContext;
  actions: EditorActions;
  preview: ReactNode;
}
function EditorShell({ context: c, actions, preview }: ShellProps) {
  const file = useRef<HTMLInputElement>(null),
    view = c.view;
  const tab = view.tab === "Game" && c.project.gameMode === "narrative" ? "Story" : view.tab;
  return (
    <div className="story-editor" onKeyDownCapture={(event) => editorShortcut(event, c.state)}>
      <EditorHeader
        project={c.project}
        locale={c.activeLocale}
        state={c.state}
        onLocale={(locale) => c.patchView({ locale })}
        onDialog={(dialog) => c.patchView({ dialog })}
        busy={view.busy}
        onPreview={() => void actions.play()}
        onFind={actions.find}
      />
      <Ribbon
        textTools={<TextToolbar selection={actions.selectedText} apply={actions.formatText} />}
        tab={tab}
        collapsed={view.collapsed}
        gameMode={c.project.gameMode}
        onTab={(tab) => c.patchView({ tab })}
        onCollapse={() => c.patchView({ collapsed: !view.collapsed })}
        onCommand={actions.open}
        onInsert={actions.insert}
      />
      <EditorWorkspace
        context={c}
        actions={actions}
        preview={preview}
        onChooseFile={() => file.current?.click()}
      />
      <EditorStatus context={c} actions={actions} />
      <input
        ref={file}
        type="file"
        accept=".ink,.json"
        hidden
        onChange={uploadChosenFile(actions.importFile)}
      />
    </div>
  );
}
function EditorStatus({ context: c, actions }: Pick<ShellProps, "context" | "actions">) {
  return (
    <footer className="editor-status">
      <span role="status">{c.state.status}</span>
      <button onClick={() => c.patchView({ dialog: "Issues" })}>
        {c.state.issues.length ? `${c.state.issues.length} issue(s)` : "No reported issues"}
      </button>
      <span>{c.activeLocale.toUpperCase()} / UTF-8 / Ink</span>
      <button disabled={c.view.busy} onClick={() => void actions.play(c.view.selectedPath)}>
        Preview from {c.selectedScene}
      </button>
    </footer>
  );
}
