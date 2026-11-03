import { useState } from "react";
import type { ReactNode } from "react";
import { StoryConfigurationSchema } from "../../contracts/editor-project.ts";
import { addLanguage } from "./add-language.ts";
import type { StoryProject } from "../../contracts/editor-project.ts";
import { SceneSchema } from "../../contracts/presentation.ts";
import { EditorDialog } from "./EditorDialog.tsx";
import { StorySettings } from "./StorySettings.tsx";
import { NarrationDialog } from "./NarrationDialog.tsx";
import { MediaDialog } from "./MediaDialog.tsx";
import { CommandDialog } from "./CommandDialog.tsx";
import { JsonProperties } from "./JsonProperties.tsx";
import { message } from "./use-editor-project.ts";
import type { useEditorProject } from "./use-editor-project.ts";
import { download } from "./downloads.ts";

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

export function EditorOverlays({ context: c }: { context: Context }) {
  const { project, locale, dialog, sceneId, state, onClose } = c;
  const language = project.languages[locale]!;
  function applyLanguage(next: typeof language, label: string) {
    state.update({ ...project, languages: { ...project.languages, [locale]: next } }, label);
  }
  if (
    [
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
    ].includes(dialog)
  )
    return (
      <CommandDialog
        command={dialog}
        script={language.script}
        onInsert={c.onInsert}
        onClose={onClose}
      />
    );
  if (["Image", "Animation", "Sound Effect", "Background Music"].includes(dialog))
    return (
      <MediaDialog
        key={`${dialog}:${c.selectedMedia}`}
        kind={dialog}
        project={project}
        locale={locale}
        passageId={sceneId}
        selectedId={c.selectedMedia}
        onClose={onClose}
        onApply={(next, reference) => {
          if (c.selectedMedia) state.update(next, "Updated media properties");
          else c.onInsert(reference, false, next);
        }}
      />
    );
  if (["Character", "Stats", "Ability"].includes(dialog))
    return (
      <JsonProperties
        title={`${dialog} — existing engine configuration`}
        value={language.configuration.character}
        onApply={(value) =>
          applyLanguage(
            {
              ...language,
              configuration: {
                ...language.configuration,
                character: StoryConfigurationSchema.shape.character.parse(value),
              },
            },
            "Updated character",
          )
        }
        onClose={onClose}
        description="The runtime rolls STR, DEX and WIL once at character initialization and retains the result in its checkpoint. Abilities are informational Rank 1."
      />
    );
  const dialogs: Record<string, ReactNode> = {
    "Story Settings": (
      <StorySettings
        project={project}
        locale={locale}
        onApply={(next) => state.update(next, "Updated story settings")}
        onClose={onClose}
      />
    ),
    TTS: (
      <NarrationDialog
        project={project}
        locale={locale}
        onApply={(next) => state.update(next, "Updated narration")}
        onClose={onClose}
      />
    ),
    "Project Properties": (
      <JsonProperties
        title="All story properties"
        value={language.configuration}
        onApply={(value) =>
          applyLanguage(
            { ...language, configuration: StoryConfigurationSchema.parse(value) },
            "Updated story properties",
          )
        }
        onClose={onClose}
      />
    ),
    "Scene Properties": (
      <JsonProperties
        title={`Scene Properties — ${sceneId}`}
        value={language.configuration.scenes?.[sceneId] ?? { title: sceneId, progress: 0 }}
        onApply={(value) =>
          applyLanguage(
            {
              ...language,
              configuration: {
                ...language.configuration,
                scenes: { ...language.configuration.scenes, [sceneId]: SceneSchema.parse(value) },
              },
            },
            "Updated Scene Properties",
          )
        }
        onClose={onClose}
      />
    ),
    Issues: <IssuesPanel context={c} />,
    History: <HistoryPanel context={c} />,
    "Load / Import": (
      <EditorDialog title="Load / Import" onClose={onClose}>
        <p>
          Import an Ink script into {locale}, or restore a complete project JSON backup. You can
          undo the import.
        </p>
        <button onClick={c.onChooseFile}>Choose Ink or project file</button>
        <button onClick={() => window.location.reload()}>Reload saved project</button>
      </EditorDialog>
    ),
    Export: (
      <EditorDialog title="Export project" onClose={onClose}>
        <p>
          A complete backup includes every language, uploaded recordings and all presentation and
          media references. Licensed library assets remain in the application's media directory.
        </p>
        <button onClick={() => download(`${project.storyId}-${locale}.ink`, language.script)}>
          Export Ink
        </button>
        <button
          onClick={() =>
            download(`${project.storyId}-project.json`, JSON.stringify(project, null, 2))
          }
        >
          Complete project backup
        </button>
      </EditorDialog>
    ),
    "Add Language": <AddLanguage context={c} />,
  };
  return dialogs[dialog] ?? null;
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
