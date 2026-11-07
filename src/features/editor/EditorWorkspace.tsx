import type { CSSProperties, ReactNode } from "react";
import type { EditorActionContext, EditorActions } from "./editor-actions.ts";
import { EditorOverlays } from "./EditorOverlays.tsx";
import { StoryOutline } from "./StoryOutline.tsx";
import { InkEditor } from "./InkEditor.tsx";
import { PanelDivider } from "./PanelDivider.tsx";
interface Props {
  context: EditorActionContext;
  actions: EditorActions;
  preview: ReactNode;
  onChooseFile: () => void;
}
export function EditorWorkspace({ context: c, actions, preview, onChooseFile }: Props) {
  return (
    <div
      className="editor-workspace"
      style={
        {
          "--sidebar-width": `${c.view.leftWidth}px`,
          "--preview-width": `${c.view.previewWidth}px`,
        } as CSSProperties
      }
    >
      <EditorNavigation context={c} actions={actions} />
      <ScriptWorkspace context={c} actions={actions} />
      <EditorOverlays
        context={{
          project: c.project,
          locale: c.activeLocale,
          dialog: c.view.dialog,
          sceneId: c.selectedScene,
          selectedMedia: c.view.selectedMedia,
          state: c.state,
          busy: c.view.busy,
          onClose: () => c.patchView({ dialog: "" }),
          onInsert: actions.insert,
          onChooseFile,
          onLocale: (locale) => c.patchView({ locale }),
          onCompile: actions.validate,
        }}
      />
      {preview && (
        <PanelDivider
          label="Resize preview"
          value={c.view.previewWidth}
          reverse
          onChange={(previewWidth) =>
            c.patchView({
              previewWidth: Math.max(
                260,
                Math.min(previewWidth, window.innerWidth - c.view.leftWidth - 300),
              ),
            })
          }
        />
      )}
      {preview}
    </div>
  );
}
function EditorNavigation({ context: c, actions }: Pick<Props, "context" | "actions">) {
  return (
    <>
      <StoryOutline
        language={c.language}
        locale={c.activeLocale}
        locales={Object.keys(c.project.languages)}
        selectedScene={c.selectedScene}
        onLocale={(locale) => c.patchView({ locale })}
        onNavigate={actions.navigate}
        onDialog={(dialog) => c.patchView({ dialog })}
        onMedia={actions.editMedia}
        onHover={actions.hoverMedia}
      />
      <PanelDivider
        label="Resize navigation"
        value={c.view.leftWidth}
        onChange={(leftWidth) =>
          c.patchView({
            leftWidth: Math.max(
              120,
              Math.min(
                leftWidth,
                window.innerWidth * 0.4,
                window.innerWidth - c.view.previewWidth - 300,
              ),
            ),
          })
        }
      />
    </>
  );
}
function ScriptWorkspace({ context: c, actions }: Pick<Props, "context" | "actions">) {
  return (
    <section className="editor-script" aria-label="Script workspace">
      <div className="script-tab">
        <strong>
          {c.project.storyId} / {c.activeLocale}.ink
        </strong>
        <span>INK SCRIPT</span>
      </div>
      <div className="translation-note" hidden={!c.language.missingTranslation}>
        Translation needs review. Open Story Settings to mark it reviewed.
      </div>
      <InkEditor
        value={c.language.script}
        onChange={actions.changeScript}
        onReady={actions.ready}
        onError={actions.error}
        onCursor={actions.cursor}
      />
    </section>
  );
}
