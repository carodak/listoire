import { useState } from "react";
import type { StoryProject } from "../../contracts/editor-project.ts";
import { defaultSpeechSettings } from "../../contracts/media.ts";
import type { VoiceProfile, SpeechSettings } from "../../contracts/media.ts";
import { VoiceExample } from "./VoiceExample.tsx";
import { Field } from "./Fields.tsx";
type Language = StoryProject["languages"][string];
function availableProfiles(language: Language, locale: string): VoiceProfile[] {
  const builtin: VoiceProfile[] = [
    ...(locale === "en"
      ? [{ id: "nano-default", label: "Default narrator · Nano", model: "nano" as const }]
      : []),
    {
      id: "multilingual-default",
      label: "Default narrator · Multilingual",
      model: "multilingual-v3",
    },
  ];
  return [
    ...builtin,
    ...(language.configuration.voiceProfiles ?? []).filter(
      (profile) => !builtin.some((item) => item.id === profile.id),
    ),
  ];
}
interface VoiceDesignerProps {
  language: Language;
  locale: string;
  onChange: (language: Language | ((current: Language) => Language)) => void;
}
export function VoiceDesigner({ language, locale, onChange }: VoiceDesignerProps) {
  const [busy, setBusy] = useState(false);
  const profiles = availableProfiles(language, locale);
  const voice =
    profiles.find((profile) => profile.id === language.defaults.narratorVoice) ?? profiles[0]!;
  const settings = language.configuration.speechSettings ?? defaultSpeechSettings;
  const choose = (profile: VoiceProfile, list = profiles) =>
    onChange((current) => selectVoice(current, profile, list));
  return (
    <section className="voice-designer">
      <fieldset disabled={busy}>
        <VoiceSelectors voice={voice} profiles={profiles} locale={locale} onChange={choose} />
      </fieldset>
      <VoiceExample
        model={voice.model}
        count={profiles.length}
        onBusy={setBusy}
        onAdd={(profile) => choose(profile, [...profiles, profile])}
      />
      {voice.reference && (
        <>
          <audio controls preload="metadata" src={voice.reference.data} />
          <button
            disabled={busy}
            type="button"
            onClick={() =>
              choose(
                profiles[0]!,
                profiles.filter((profile) => profile.id !== voice.id),
              )
            }
          >
            Remove this voice
          </button>
        </>
      )}
      <GenerationDefaults
        model={voice.model}
        settings={settings}
        onChange={(field, value) =>
          onChange({
            ...language,
            configuration: {
              ...language.configuration,
              speechSettings: { ...settings, [field]: value },
            },
          })
        }
      />
      <p className="editor-hint">
        Speed and volume apply immediately to the audio preview. Regenerate to hear pitch or
        generation changes.
      </p>
    </section>
  );
}
function selectVoice(language: Language, profile: VoiceProfile, list: VoiceProfile[]): Language {
  return {
    ...language,
    configuration: {
      ...language.configuration,
      voiceProfiles: list,
      narratorVoices: list.map(({ id, label }) => ({ id, label })),
      narratorVoiceSelection: language.configuration.narratorVoiceSelection
        ? [
            ...new Set([
              ...language.configuration.narratorVoiceSelection.filter((id) =>
                list.some((item) => item.id === id),
              ),
              profile.id,
            ]),
          ]
        : undefined,
    },
    defaults: { ...language.defaults, narratorVoice: profile.id },
  };
}
function VoiceSelectors({
  voice,
  profiles,
  locale,
  onChange,
}: {
  voice: VoiceProfile;
  profiles: VoiceProfile[];
  locale: string;
  onChange: (profile: VoiceProfile) => void;
}) {
  return (
    <>
      <label>
        AI model
        <select
          aria-label="AI model"
          value={voice.model}
          onChange={(event) =>
            onChange(profiles.find((profile) => profile.model === event.target.value)!)
          }
        >
          <option value="nano" disabled={locale !== "en"}>
            Chatterbox Nano / English
          </option>
          <option value="multilingual-v3">Chatterbox Multilingual V3</option>
        </select>
      </label>
      <label>
        Voice
        <select
          aria-label="Voice"
          value={voice.id}
          onChange={(event) =>
            onChange(profiles.find((profile) => profile.id === event.target.value)!)
          }
        >
          {profiles
            .filter((profile) => profile.model === voice.model)
            .map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.label}
              </option>
            ))}
        </select>
      </label>
    </>
  );
}
const controls = [
  ["pitch", "Pitch (semitones)", -12, 12, 1],
  ["temperature", "Variation / temperature", 0.1, 2, 0.05],
  ["exaggeration", "Expressiveness", 0, 2, 0.05],
  ["cfgWeight", "Voice guidance", 0, 1, 0.05],
  ["seed", "Random seed", 0, 2147483647, 1],
] as const;
function GenerationDefaults({
  model,
  settings,
  onChange,
}: {
  model: VoiceProfile["model"];
  settings: SpeechSettings;
  onChange: (field: keyof SpeechSettings, value: number) => void;
}) {
  return (
    <fieldset>
      <legend>Generation defaults</legend>
      {controls.map(([field, label, min, max, step]) => {
        const disabled = model === "nano" && (field === "cfgWeight" || field === "exaggeration");
        return (
          <Field
            key={field}
            label={label}
            type="number"
            min={min}
            max={max}
            step={step}
            value={settings[field]}
            disabled={disabled}
            help={
              disabled
                ? "Available with Multilingual V3; Nano does not support this parameter."
                : `Default ${label.toLowerCase()} for generated speech.`
            }
            onChange={(event) => onChange(field, Number(event.target.value))}
          />
        );
      })}
    </fieldset>
  );
}
