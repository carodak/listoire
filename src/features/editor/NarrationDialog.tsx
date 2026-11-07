import { useState } from "react";
import { StoryProjectSchema } from "../../contracts/editor-project.ts";
import type { StoryProject } from "../../contracts/editor-project.ts";
import { EditorDialog } from "./EditorDialog.tsx";
import { NarrationModeSelect } from "./NarrationModeSelect.tsx";
import { VoiceDesigner } from "./VoiceDesigner.tsx";
import { VoiceControls } from "./NarrationVoiceControls.tsx";
import { DeviceVoices } from "./DeviceVoices.tsx";
import { NarrationRecorder } from "./NarrationRecorder.tsx";
import { applyNarrationConfiguration } from "./narration-sources.ts";
interface Props {
  project: StoryProject;
  locale: string;
  onApply: (project: StoryProject) => void;
  onClose: () => void;
}
export function NarrationDialog({ project, locale, onApply, onClose }: Props) {
  const [language, setLanguage] = useState(structuredClone(project.languages[locale]!)),
    [error, setError] = useState("");
  return (
    <EditorDialog title="TTS / Narration" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            onApply(
              StoryProjectSchema.parse(applyNarrationConfiguration(project, locale, language)),
            );
            onClose();
          } catch (error) {
            setError(error instanceof Error ? error.message : String(error));
          }
        }}
      >
        <NarrationModeSelect
          value={language.narrationMode}
          onChange={(narrationMode) => setLanguage({ ...language, narrationMode })}
        />
        {language.narrationMode.startsWith("ai-") && (
          <VoiceDesigner language={language} locale={locale} onChange={setLanguage} />
        )}
        <VoiceControls language={language} onChange={setLanguage} />
        {language.narrationMode === "ai-live" && (
          <DeviceVoices language={language} locale={locale} onChange={setLanguage} />
        )}
        <NarrationRecorder
          storyId={project.storyId}
          locale={locale}
          language={language}
          onChange={setLanguage}
        />
        {error && <p role="alert">{error}</p>}
        <p className="editor-hint">
          Clips remain previews until listening review. Backups embed recordings; library media
          retain licensed file references.
        </p>
        <footer>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary">
            Apply narration
          </button>
        </footer>
      </form>
    </EditorDialog>
  );
}
