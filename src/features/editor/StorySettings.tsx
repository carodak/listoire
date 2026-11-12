import { useState } from "react";
import type { StoryProject } from "../../contracts/editor-project.ts";
import { gameModes } from "../../contracts/story.ts";
import { EditorDialog, EditorFormActions } from "./EditorDialog.tsx";
import { NarrationModeSelect } from "./NarrationModeSelect.tsx";
import { PaperPalette } from "../presentation/PaperPalette.tsx";
import { Field, SelectField, TextareaField } from "./Fields.tsx";
type Language = StoryProject["languages"][string];
interface LanguageProps {
  language: Language;
  onChange: (patch: Partial<Language>) => void;
}
interface Props {
  project: StoryProject;
  locale: string;
  onApply: (project: StoryProject) => void;
  onClose: () => void;
}
export function StorySettings({ project, locale, onApply, onClose }: Props) {
  const [draft, setDraft] = useState(structuredClone(project));
  const language = draft.languages[locale]!;
  const changeLanguage = (patch: Partial<Language>) =>
    setDraft(updateSettings(draft, locale, patch));
  return (
    <EditorDialog title="Story Settings" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onApply(draft);
          onClose();
        }}
      >
        <p className="editor-hint">
          Stable story ID: <code>{project.storyId}</code> · Editing {locale}
        </p>
        <Field
          type="checkbox"
          label="Apply shared configuration to all languages"
          help="Shared defaults apply across languages. Uncheck to make a language-specific override; translated prose and titles are preserved."
          checked={draft.shareConfiguration ?? false}
          onChange={(event) => setDraft({ ...draft, shareConfiguration: event.target.checked })}
        />
        <StoryMetadata language={language} onChange={changeLanguage} />
        <SelectField
          label="Default language"
          value={draft.defaultLocale}
          options={Object.keys(draft.languages)}
          onChange={(defaultLocale) => setDraft({ ...draft, defaultLocale })}
        />
        <SelectField
          label="Game Mode"
          value={draft.gameMode}
          options={gameModes}
          onChange={(gameMode) => setDraft({ ...draft, gameMode })}
          labels={{
            narrative: "Narrative Only",
            "rpg-no-combat": "Game Mode — No Combat",
            "with-combat": "Game Mode — With Combat",
          }}
        />
        <p className="editor-hint">
          Author checks, inventory, abilities and encounters from Game. Results and random state are
          saved with the story.
        </p>
        <ReadingDefaults language={language} onChange={changeLanguage} />
        {language.missingTranslation && (
          <Field
            label="I have reviewed this translation"
            type="checkbox"
            checked={!language.missingTranslation}
            onChange={(event) => changeLanguage({ missingTranslation: !event.target.checked })}
          />
        )}
        <EditorFormActions onClose={onClose}>Apply settings</EditorFormActions>
      </form>
    </EditorDialog>
  );
}
function updateSettings(draft: StoryProject, locale: string, patch: Partial<Language>) {
  const language = draft.languages[locale]!,
    languages = { ...draft.languages };
  const defaults = Object.fromEntries(
    Object.entries(patch.defaults ?? {}).filter(
      ([key, value]) => value !== language.defaults[key as keyof typeof language.defaults],
    ),
  );
  for (const id of draft.shareConfiguration ? Object.keys(languages) : [locale]) {
    const current = languages[id]!;
    languages[id] =
      id === locale
        ? { ...language, ...patch }
        : {
            ...current,
            defaults: { ...current.defaults, ...defaults },
            ...(patch.narrationMode ? { narrationMode: patch.narrationMode } : {}),
          };
  }
  return { ...draft, languages };
}
function StoryMetadata({ language, onChange }: LanguageProps) {
  return (
    <>
      <Field
        label="Story title"
        required
        value={language.configuration.title}
        onChange={(event) =>
          onChange({ configuration: { ...language.configuration, title: event.target.value } })
        }
      />
      <TextareaField
        label="Description"
        value={language.description}
        onChange={(event) => onChange({ description: event.target.value })}
      />
      <SelectField
        label="Cover image"
        value={language.cover ?? ""}
        onChange={(cover) => onChange({ cover: cover || undefined })}
        options={[
          "",
          ...(language.configuration.assets
            ?.filter((asset) => asset.type === "image")
            .map((asset) => asset.id) ?? []),
        ]}
        labels={{ "": "No cover" }}
      />
    </>
  );
}
function ReadingDefaults({ language, onChange }: LanguageProps) {
  const defaults = language.defaults;
  return (
    <>
      <NarrationModeSelect
        value={language.narrationMode}
        onChange={(narrationMode) => onChange({ narrationMode })}
      />
      <PaperPalette
        color={defaults.backgroundColor}
        onChange={(backgroundColor) => onChange({ defaults: { ...defaults, backgroundColor } })}
      />
      <Field
        label="Opening letter color"
        help="Color of the large initial on each page. Choose a darker gold for contrast on pale paper."
        type="color"
        value={defaults.dropCapColor ?? "#b58b37"}
        onChange={(event) =>
          onChange({ defaults: { ...defaults, dropCapColor: event.target.value } })
        }
      />
      {(["narration", "sound", "pageTurn"] as const).map((field) => (
        <Field
          key={field}
          type="checkbox"
          label={
            {
              narration: "Narration enabled by default",
              sound: "Sound enabled by default",
              pageTurn: "Page-turn transitions by default",
            }[field]
          }
          checked={defaults[field] ?? false}
          onChange={(event) =>
            onChange({ defaults: { ...defaults, [field]: event.target.checked } })
          }
        />
      ))}
    </>
  );
}
