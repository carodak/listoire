import { useRef, useReducer, useEffect, useEffectEvent, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { uploadChosenFile } from "./Fields.tsx";
import type { ReactNode } from "react";
import type { StoryBundle } from "../../contracts/story.ts";
import type { StoryProject } from "../../contracts/editor-project.ts";
import type { EditorView } from "./editor-view.ts";
import { EditorActions } from "./editor-actions.ts";
import type { EditorActionContext } from "./editor-actions.ts";
import { useEditorProject } from "./use-editor-project.ts";
import { download } from "./downloads.ts";
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
    settled: boolean,
  ) => ReactNode;
}
type ViewChange = Partial<EditorView> | ((view: EditorView) => Partial<EditorView>);
/** How long the script must stay unchanged before the preview follows it. */
const LIVE_PREVIEW_MS = 600;

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
  const { t } = useTranslation();
  const unreadable = state.unreadable;
  return state.project ? (
    <LoadedEditor state={state} project={state.project} renderPreview={renderPreview} />
  ) : (
    <main className="editor-loading">
      <h1>Story Editor</h1>
      <p role="status">{state.status}</p>
      {unreadable && (
        <>
          <p>{t("editor.unreadable.hint")}</p>
          <button
            onClick={() => download("listoire-saved-project.json", JSON.stringify(unreadable.raw))}
          >
            {t("editor.unreadable.download")}
          </button>{" "}
          <button className="primary" onClick={() => void state.startAgain(unreadable.revision)}>
            {t("editor.unreadable.startAgain")}
          </button>
        </>
      )}
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
    (before: EditorView, change: ViewChange) => ({
      ...before,
      ...(typeof change === "function" ? change(before) : change),
    }),
    initialView,
  );
  const handles = useRef<EditorActionContext["handles"]["current"]>({
    editor: null,
    selection: null,
    suppress: false,
  });
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
  // Each change refreshes the open preview once typing pauses.
  const refresh = useEffectEvent(() => void actions.refresh());
  useEffect(() => {
    const timer = setTimeout(refresh, LIVE_PREVIEW_MS);
    return () => clearTimeout(timer);
  }, [project]);
  useEditorTooltips(true);
  const preview = view.preview ? (
    <div className="preview-slot" key={view.preview.key}>
      {renderPreview(
        view.preview.bundle,
        project,
        view.preview.knot,
        () => patchView({ preview: null }),
        Boolean(view.preview.settled),
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
    <div
      className="story-editor"
      onKeyDownCapture={(event) =>
        editorShortcut(event, {
          undo: c.state.undo,
          redo: c.state.redo,
          save: c.state.save,
          find: (replace) => actions.open(replace ? "Replace" : "Find"),
          format: (command) =>
            actions.report(command === "clear" ? actions.clearText() : actions.toggleText(command)),
        })
      }
    >
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
        textTools={<TextToolbar actions={actions} paper={c.language.defaults.backgroundColor} />}
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
      <EditorStatus context={c} actions={actions} textShown={tab === "Text" && !view.collapsed} />
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
function EditorStatus({
  context: c,
  actions,
  textShown,
}: Pick<ShellProps, "context" | "actions"> & { textShown: boolean }) {
  const { t } = useTranslation();
  // A shortcut that can't format explains itself here when the Text toolbar is hidden.
  const formatting = useSyncExternalStore(actions.watchSelection, actions.textStatus);
  return (
    <footer className="editor-status">
      <span role="status">{formatting && !textShown ? t(formatting) : c.state.status}</span>
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
