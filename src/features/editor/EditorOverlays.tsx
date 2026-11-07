import { useState } from "react";
import { StoryConfigurationSchema } from "../../contracts/editor-project.ts";
import { addLanguage } from "./add-language.ts";
import type { StoryProject } from "../../contracts/editor-project.ts";
import { SceneSchema } from "../../contracts/presentation.ts";
import { EditorDialog } from "./EditorDialog.tsx";
import { GameEditor } from "./GameEditor.tsx";
import { StorySettings } from "./StorySettings.tsx";
import { NarrationDialog } from "./NarrationDialog.tsx";
import { MediaDialog } from "./MediaDialog.tsx";
import { CommandDialog } from "./CommandDialog.tsx";
import { JsonProperties } from "./JsonProperties.tsx";
import { message } from "./use-editor-project.ts";
import type { useEditorProject } from "./use-editor-project.ts";
import { download } from "./downloads.ts";
import { exportProjectArchive } from "./project-archive.ts";
import { applyIllustrationPack } from "./illustration-pack.ts";

interface Context {
  project: StoryProject;
  locale: string;
  dialog: string;
  sceneId: string;
  selectedMedia?: string;
  state: ReturnType<typeof useEditorProject>;
  busy: boolean;
  onClose: () => void;
  onInsert: (text: string, structural?: boolean, project?: StoryProject) => void;
  onChooseFile: () => void;
  onLocale: (locale: string) => void;
  onCompile: () => Promise<void>;
}

const inkCommands = [
  "Knot",
  "Stitch",
  "Divert",
  "Tunnel",
  "Choice",
  "Sticky Choice",
  "Nested Choice",
  "Conditional Choice",
  "Variable",
  "Insert Variable",
  "Thread",
];
const mediaCommands = ["Image", "Video", "Animation", "Sound Effect", "Background Music"];
const gameCommands = [
  "Stats",
  "Ability",
  "Item",
  "Equipment",
  "Inventory",
  "Stat Check",
  "Ability Check",
  "HP",
  "XP",
  "Combat",
  "Game Condition",
];
export function EditorOverlays({ context: c }: { context: Context }) {
  if (inkCommands.includes(c.dialog))
    return (
      <CommandDialog
        command={c.dialog}
        script={c.project.languages[c.locale]!.script}
        onInsert={c.onInsert}
        onClose={c.onClose}
      />
    );
  if (mediaCommands.includes(c.dialog)) return <MediaOverlay context={c} />;
  if (gameCommands.includes(c.dialog))
    return (
      <GameEditor
        project={c.project}
        locale={c.locale}
        command={c.dialog}
        onClose={c.onClose}
        onApply={(next, script) => {
          if (script) c.onInsert(script, true, next);
          else c.state.update(next, "Updated game configuration");
        }}
      />
    );
  if (["Character", "Project Properties", "Scene Properties"].includes(c.dialog))
    return <ConfigurationOverlay context={c} />;
  if (c.dialog === "Story Settings")
    return (
      <StorySettings
        project={c.project}
        locale={c.locale}
        onApply={(next) => c.state.update(next, "Updated story settings")}
        onClose={c.onClose}
      />
    );
  if (c.dialog === "TTS")
    return (
      <NarrationDialog
        project={c.project}
        locale={c.locale}
        onApply={(next) => c.state.update(next, "Updated narration")}
        onClose={c.onClose}
      />
    );
  if (c.dialog === "Issues") return <IssuesPanel context={c} />;
  if (c.dialog === "History") return <HistoryPanel context={c} />;
  if (c.dialog === "Add Language") return <AddLanguage context={c} />;
  if (c.dialog === "Load / Import") return <ImportOverlay context={c} />;
  if (c.dialog === "Export") return <ExportOverlay context={c} />;
  return null;
}
function MediaOverlay({ context: c }: { context: Context }) {
  return (
    <MediaDialog
      key={`${c.dialog}:${c.selectedMedia}`}
      kind={c.dialog}
      project={c.project}
      locale={c.locale}
      passageId={c.sceneId}
      selectedId={c.selectedMedia}
      onClose={c.onClose}
      onApply={(next, reference) => {
        if (c.selectedMedia) c.state.update(next, "Updated media properties");
        else c.onInsert(reference, false, next);
      }}
    />
  );
}
function ConfigurationOverlay({ context: c }: { context: Context }) {
  const { project, locale, sceneId, dialog, onClose, state } = c;
  const language = project.languages[locale]!;
  const applyLanguage = (configuration: typeof language.configuration) =>
    state.update(
      { ...project, languages: { ...project.languages, [locale]: { ...language, configuration } } },
      `Updated ${dialog}`,
    );
  if (dialog === "Character")
    return (
      <JsonProperties
        title="Character configuration"
        value={language.configuration.character}
        onClose={onClose}
        description="Attributes are rolled once and retained in the checkpoint. Abilities start at Rank 1; configure their checks and offensive effects in Game."
        onApply={(value) =>
          applyLanguage({
            ...language.configuration,
            character: StoryConfigurationSchema.shape.character.parse(value),
          })
        }
      />
    );
  if (dialog === "Project Properties")
    return (
      <JsonProperties
        title="All story properties"
        value={language.configuration}
        onClose={onClose}
        onApply={(value) => applyLanguage(StoryConfigurationSchema.parse(value))}
      />
    );
  return (
    <JsonProperties
      title={`Scene Properties / ${sceneId}`}
      value={language.configuration.scenes?.[sceneId] ?? { title: sceneId, progress: 0 }}
      onClose={onClose}
      onApply={(value) =>
        applyLanguage({
          ...language.configuration,
          scenes: { ...language.configuration.scenes, [sceneId]: SceneSchema.parse(value) },
        })
      }
    />
  );
}
function ImportOverlay({ context: c }: { context: Context }) {
  return (
    <EditorDialog title="Load / Import" onClose={c.onClose}>
      <p>
        Import an Ink script into {c.locale}, or restore a complete project backup. You can undo the
        import.
      </p>
      <button onClick={c.onChooseFile}>Choose Ink or project file</button>
      <button onClick={() => window.location.reload()}>Reload saved project</button>
      <button
        disabled={!c.state.illustrationPack}
        onClick={() => {
          c.state.update(
            applyIllustrationPack(c.project, c.state.illustrationPack!),
            "Applied new illustration pack",
          );
          c.onClose();
        }}
      >
        Apply new illustration pack
      </button>
      <p className="editor-hint">
        Updates matching example illustrations and page color. Keeps your text, audio and uploaded
        images. Undo restores the previous version.
      </p>
    </EditorDialog>
  );
}
function ExportOverlay({ context: c }: { context: Context }) {
  return (
    <EditorDialog title="Export project" onClose={c.onClose}>
      <p>
        A complete backup includes every language, recordings and media references. Licensed library
        assets remain in the application media directory.
      </p>
      <button
        onClick={() =>
          download(`${c.project.storyId}-${c.locale}.ink`, c.project.languages[c.locale]!.script)
        }
      >
        Export Ink
      </button>
      <button
        onClick={() =>
          void exportProjectArchive(c.project)
            .then((text) => download(`${c.project.storyId}-project.json`, text))
            .catch((error) => c.state.setIssues([message(error)]))
        }
      >
        Complete project backup
      </button>
    </EditorDialog>
  );
}
function IssuesPanel({ context: c }: { context: Context }) {
  return (
    <EditorDialog title="Validation issues" onClose={c.onClose}>
      <div className="issues-list">
        {c.state.issues.length ? (
          c.state.issues.map((issue, index) => (
            <pre role="alert" key={index}>
              {issue}
            </pre>
          ))
        ) : (
          <p>No compilation or configuration issues reported.</p>
        )}
      </div>
      <button
        disabled={c.busy}
        onClick={() => {
          void c.onCompile();
        }}
      >
        Compile all languages
      </button>
    </EditorDialog>
  );
}
function HistoryPanel({ context: c }: { context: Context }) {
  return (
    <EditorDialog title="Editing History" onClose={c.onClose}>
      <p>
        Version checkpoints preserve scripts, translations and media together. Restoring remains
        undoable.
      </p>
      {c.state.versions
        .slice()
        .reverse()
        .map((version, index) => (
          <div className="version" key={`${version.at}:${index}`}>
            <span>
              {new Date(version.at).toLocaleString()} · {version.label}
            </span>
            <button
              onClick={() => {
                c.state.update(version.project, "Restored history checkpoint");
                c.onClose();
              }}
            >
              Restore version
            </button>
          </div>
        ))}
    </EditorDialog>
  );
}
function AddLanguage({ context: c }: { context: Context }) {
  const [locale, setLocale] = useState("");
  const [error, setError] = useState("");
  function add(event: React.FormEvent) {
    event.preventDefault();
    try {
      const next = addLanguage(c.project, c.locale, locale);
      c.state.update(next, "Added language");
      c.onLocale(locale);
      c.onClose();
    } catch (error) {
      setError(message(error));
    }
  }
  return (
    <EditorDialog title="Add Language" onClose={c.onClose}>
      <form onSubmit={add}>
        <label>
          Language code
          <input
            required
            pattern="[a-z]{2}(-[A-Z]{2})?"
            placeholder="es or pt-BR"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
          />
        </label>
        <p>
          The shared structure and source text are copied as an explicitly unreviewed translation.
          Existing languages are preserved.
        </p>
        {error && <p role="alert">{error}</p>}
        <button className="primary" type="submit">
          Add Language
        </button>
      </form>
    </EditorDialog>
  );
}
