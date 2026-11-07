import { Field } from "./Fields.tsx";
import type { StoryProject } from "../../contracts/editor-project.ts";
type Language = StoryProject["languages"][string];
function voiceSelection(language: Language) {
  const voices = language.configuration.narratorVoices ?? [];
  const selectedVoices = language.configuration.narratorVoiceSelection ?? voices.map((v) => v.id);
  const requested = language.defaults.narratorVoice ?? "";
  return {
    voices,
    selectedVoices,
    voice: selectedVoices.includes(requested) ? requested : (selectedVoices[0] ?? ""),
  };
}
interface VoiceControlsProps {
  language: Language;
  onChange: (language: Language) => void;
}

export function VoiceControls({ language, onChange }: VoiceControlsProps) {
  return (
    <>
      <VoiceAvailability language={language} onChange={onChange} />
      <Field
        label="Speed"
        type="number"
        min={0.5}
        max={2}
        step={0.1}
        value={language.defaults.narrationRate ?? 1}
        onChange={(event) =>
          onChange({
            ...language,
            defaults: { ...language.defaults, narrationRate: Number(event.target.value) },
          })
        }
      />
      <Field
        label="Volume"
        type="number"
        min={0}
        max={1}
        step={0.05}
        value={language.defaults.volumes?.narration ?? 0.8}
        onChange={(event) =>
          onChange({
            ...language,
            defaults: {
              ...language.defaults,
              volumes: {
                sfx: 0.65,
                ambience: 0.3,
                music: 0.3,
                ...language.defaults.volumes,
                narration: Number(event.target.value),
              },
            },
          })
        }
      />
      <Field
        label="Narrate by default"
        type="checkbox"
        checked={language.defaults.narration ?? false}
        onChange={(event) =>
          onChange({
            ...language,
            defaults: { ...language.defaults, narration: event.target.checked },
          })
        }
      />
    </>
  );
}

function VoiceAvailability({ language, onChange }: VoiceControlsProps) {
  const { voices, selectedVoices } = voiceSelection(language);
  return (
    <fieldset>
      <legend>Available voices</legend>
      {voices.map((v) => (
        <label className="check" key={v.id}>
          <input
            type="checkbox"
            checked={selectedVoices.includes(v.id)}
            onChange={(e) =>
              onChange({
                ...language,
                configuration: {
                  ...language.configuration,
                  narratorVoiceSelection: e.target.checked
                    ? [...selectedVoices, v.id]
                    : selectedVoices.filter((id) => id !== v.id),
                },
              })
            }
          />
          {v.label}
        </label>
      ))}
    </fieldset>
  );
}
