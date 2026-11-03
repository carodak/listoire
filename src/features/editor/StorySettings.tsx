import { NarrationModeSelect } from "./NarrationModeSelect.tsx";
import { useState } from "react";
import type { StoryProject } from "../../contracts/editor-project.ts";
import { EditorDialog } from "./EditorDialog.tsx";

export function StorySettings({
  project,
  locale,
  onApply,
  onClose,
}: {
  project: StoryProject;
  locale: string;
  onApply: (project: StoryProject) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(structuredClone(project));
  const language = draft.languages[locale]!;
  function changeLanguage(patch: Partial<typeof language>) {
    setDraft({ ...draft, languages: { ...draft.languages, [locale]: { ...language, ...patch } } });
  }
  return (
    <EditorDialog title="Story Settings" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onApply(draft);
          onClose();
        }}
      >
        <p className="editor-hint">
          Stable story ID: <code>{project.storyId}</code> · Editing {locale}
        </p>
        <label>
          Story title
          <input
            required
            value={language.configuration.title}
            onChange={(e) =>
              changeLanguage({
                configuration: { ...language.configuration, title: e.target.value },
              })
            }
          />
        </label>
        <label>
          Description
          <textarea
            value={language.description}
            onChange={(e) => changeLanguage({ description: e.target.value })}
          />
        </label>
        <label>
          Cover image
          <select
            value={language.cover ?? ""}
            onChange={(e) => changeLanguage({ cover: e.target.value || undefined })}
          >
            <option value="">No cover</option>
            {language.configuration.assets
              ?.filter((a) => a.type === "image")
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id}
                </option>
              ))}
          </select>
        </label>
        <label>
          Default language
          <select
            value={draft.defaultLocale}
            onChange={(e) => setDraft({ ...draft, defaultLocale: e.target.value })}
          >
            {Object.keys(draft.languages).map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          Game Mode
          <select
            aria-label="Game Mode"
            value={draft.gameMode}
            onChange={(e) =>
              setDraft({ ...draft, gameMode: e.target.value as StoryProject["gameMode"] })
            }
          >
            <option value="narrative">Narrative Only</option>
            <option value="rpg-no-combat">Game Mode — No Combat</option>
            <option value="with-combat" disabled>
              Game Mode — With Combat (engine unavailable)
            </option>
          </select>
        </label>
        <p className="editor-hint">
          The existing engine supports character initialization and informational abilities.
          Inventory, checks, XP and combat have no executor in this application. Switching modes
          preserves character configuration.
        </p>
        <NarrationModeSelect
          value={language.narrationMode}
          onChange={(mode) => changeLanguage({ narrationMode: mode })}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={language.defaults.narration ?? false}
            onChange={(e) =>
              changeLanguage({ defaults: { ...language.defaults, narration: e.target.checked } })
            }
          />
          Narration enabled by default
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={language.defaults.sound}
            onChange={(e) =>
              changeLanguage({ defaults: { ...language.defaults, sound: e.target.checked } })
            }
          />
          Sound enabled by default
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={language.defaults.pageTurn ?? false}
            onChange={(event) =>
              changeLanguage({ defaults: { ...language.defaults, pageTurn: event.target.checked } })
            }
          />
          Page-turn transitions by default
        </label>
        {language.missingTranslation && (
          <label className="check">
            <input
              type="checkbox"
              checked={!language.missingTranslation}
              onChange={(e) => changeLanguage({ missingTranslation: !e.target.checked })}
            />
            I have reviewed this translation
          </label>
        )}
        <footer>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" type="submit">
            Apply settings
          </button>
        </footer>
      </form>
    </EditorDialog>
  );
}
