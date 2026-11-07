import { useState } from "react";
import type { StoryProject } from "../../contracts/editor-project.ts";
import type { useEditorProject } from "./use-editor-project.ts";

interface EditorHeaderProps {
  project: StoryProject;
  locale: string;
  state: ReturnType<typeof useEditorProject>;
  onLocale: (locale: string) => void;
  onDialog: (dialog: string) => void;
  busy: boolean;
  onPreview: () => void;
  onFind: (query: string, replace: boolean) => void;
}

export function EditorHeader({
  project,
  locale,
  state,
  onLocale,
  onDialog,
  busy,
  onPreview,
  onFind,
}: EditorHeaderProps) {
  return (
    <header className="editor-header">
      <HeaderIdentity {...{ project, locale, state, onLocale, onDialog }} />
      <div className="editor-actions">
        <button
          className="primary"
          disabled={busy}
          onClick={() => {
            void state.save();
          }}
        >
          Save
        </button>
        <button onClick={() => onDialog("Load / Import")}>Load / Import</button>
        <button onClick={() => onDialog("Export")}>Export</button>
        <button
          aria-label="Undo"
          title="Undo (Ctrl/Cmd+Z)"
          disabled={!state.canUndo}
          onClick={state.undo}
        >
          ↶
        </button>
        <button
          aria-label="Redo"
          title="Redo (Ctrl/Cmd+Shift+Z)"
          disabled={!state.canRedo}
          onClick={state.redo}
        >
          ↷
        </button>
        <HeaderSearch onFind={onFind} />
      </div>
      <div className="editor-view-actions">
        <button onClick={() => onDialog("Story Settings")} title="Story Settings">
          Settings
        </button>
        <button className="preview-button" disabled={busy} onClick={onPreview}>
          ▷ Preview
        </button>
      </div>
    </header>
  );
}
function HeaderIdentity({
  project,
  locale,
  state,
  onLocale,
  onDialog,
}: Pick<EditorHeaderProps, "project" | "locale" | "state" | "onLocale" | "onDialog">) {
  const language = project.languages[locale]!;
  return (
    <div className="editor-identity">
      <div className="editor-brand">
        <a
          href="/"
          aria-label="Return to Listoire"
          onClick={(event) => {
            event.preventDefault();
            void state.save().then((saved) => {
              if (saved) window.location.assign("/");
            });
          }}
        >
          Story Editor
        </a>
      </div>
      <div className="editor-document-heading">
        <label className="editor-title">
          <span className="sr-only">Story title</span>
          <input
            aria-label="Story title"
            style={{ width: `${Math.max(14, language.configuration.title.length + 2)}ch` }}
            value={language.configuration.title}
            onChange={(event) =>
              state.update(
                {
                  ...project,
                  languages: {
                    ...project.languages,
                    [locale]: {
                      ...language,
                      configuration: { ...language.configuration, title: event.target.value },
                    },
                  },
                },
                "Renamed story",
              )
            }
          />
        </label>
        <label className="editor-language">
          <span className="sr-only">Story language</span>
          <select
            aria-label="Story language"
            title={languageLabel(locale, language.missingTranslation)}
            value={locale}
            onChange={(event) =>
              event.target.value === "__add"
                ? onDialog("Add Language")
                : onLocale(event.target.value)
            }
          >
            {Object.keys(project.languages).map((code) => (
              <option value={code} key={code}>
                {code.toUpperCase()}
                {project.languages[code]!.missingTranslation ? " *" : ""}
              </option>
            ))}
            <option value="__add">+ Add Language…</option>
          </select>
        </label>
      </div>
    </div>
  );
}
function HeaderSearch({ onFind }: Pick<EditorHeaderProps, "onFind">) {
  const [find, setFind] = useState("");
  return (
    <form
      className="editor-find"
      onSubmit={(event) => {
        event.preventDefault();
        onFind(find, false);
      }}
    >
      <input
        aria-label="Find in Ink"
        type="search"
        placeholder="Find in story…"
        value={find}
        onChange={(event) => setFind(event.target.value)}
      />
      <button
        title="Find text in the Ink script. Advanced replacement is available in the search popup."
        aria-label="Find text"
        type="submit"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
          <circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="m15 15 6 6" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
    </form>
  );
}
function languageLabel(code: string, missing: boolean) {
  return `${({ en: "English", fr: "Français" } as Record<string, string>)[code] ?? code}${missing ? " · Needs translation" : ""}`;
}
