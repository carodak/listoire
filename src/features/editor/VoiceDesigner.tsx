import { useState } from "react";
import type { StoryProject } from "../../contracts/editor-project.ts";
import { defaultSpeechSettings, VoiceProfileSchema } from "../../contracts/media.ts";
import type { VoiceProfile, SpeechSettings } from "../../contracts/media.ts";
import { audioDuration } from "./narration-authoring.ts";
import { DurationField } from "./DurationField.tsx";

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
export function VoiceDesigner({
  language,
  locale,
  onChange,
}: {
  language: Language;
  locale: string;
  onChange: (language: Language | ((current: Language) => Language)) => void;
}) {
  const [draft, setDraft] = useState({ name: "", rights: "", error: "", duration: 0, busy: false });
  const profiles = availableProfiles(language, locale);
  const voice =
    profiles.find((profile) => profile.id === language.defaults.narratorVoice) ?? profiles[0]!;
  const settings = language.configuration.speechSettings ?? defaultSpeechSettings;
  function choose(profile: VoiceProfile, list = profiles) {
    onChange((current) => ({
      ...current,
      configuration: {
        ...current.configuration,
        voiceProfiles: list,
        narratorVoices: list.map(({ id, label }) => ({ id, label })),
        narratorVoiceSelection: current.configuration.narratorVoiceSelection
          ? [
              ...new Set([
                ...current.configuration.narratorVoiceSelection.filter((id) =>
                  list.some((item) => item.id === id),
                ),
                profile.id,
              ]),
            ]
          : undefined,
      },
      defaults: { ...current.defaults, narratorVoice: profile.id },
    }));
  }
  async function reference(file: File) {
    try {
      if (profiles.length >= 8) throw new Error("A language can have up to eight voices.");
      if (!draft.name.trim() || !draft.rights.trim())
        throw new Error("Name the voice and confirm permission to use its recording first.");
      if (file.size > 5_000_000 || !/\.(mp3|wav)$/i.test(file.name))
        throw new Error("Use an MP3 or WAV up to 5 MB and 30 seconds.");
      setDraft({ ...draft, busy: true, error: "" });
      const url = URL.createObjectURL(file);
      try {
        const duration = draft.duration * 1000 || (await audioDuration(url));
        if (duration < 6000 || duration > 30000)
          throw new Error("The voice example must be between 6 and 30 seconds.");
      } finally {
        URL.revokeObjectURL(url);
      }
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          resolve(
            String(reader.result).replace(
              /^data:[^;]+;/,
              `data:audio/${/\.wav$/i.test(file.name) ? "wav" : "mpeg"};`,
            ),
          );
        reader.onerror = () => reject(new Error("Could not read the voice recording."));
        reader.readAsDataURL(file);
      });
      const profile = VoiceProfileSchema.parse({
        id: `voice.${crypto.randomUUID()}`,
        label: draft.name,
        model: voice.model,
        reference: { name: file.name, data, rights: draft.rights },
      });
      choose(profile, [...profiles, profile]);
      setDraft({ name: "", rights: "", error: "", duration: 0, busy: false });
    } catch (error) {
      setDraft((current) => ({
        ...current,
        busy: false,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }
  function change(field: keyof SpeechSettings, value: number) {
    onChange({
      ...language,
      configuration: { ...language.configuration, speechSettings: { ...settings, [field]: value } },
    });
  }
  return (
    <section className="voice-designer">
      <label>
        AI model
        <select
          aria-label="AI model"
          disabled={draft.busy}
          value={voice.model}
          onChange={(e) => choose(profiles.find((profile) => profile.model === e.target.value)!)}
        >
          <option value="nano" disabled={locale !== "en"}>
            Chatterbox Nano · English
          </option>
          <option value="multilingual-v3">Chatterbox Multilingual V3</option>
        </select>
      </label>
      <label>
        Voice
        <select
          aria-label="Voice"
          disabled={draft.busy}
          value={voice.id}
          onChange={(e) => choose(profiles.find((profile) => profile.id === e.target.value)!)}
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
      <details>
        <summary title="Add a distinct voice using a recording you are allowed to use">
          Add a voice from an example
        </summary>
        <p>
          Voice conditioning uses an example recording; model weights stay unchanged. Maximum 5 MB /
          30 seconds; 6–15 seconds of clear speech is recommended.
        </p>
        <label>
          Voice name
          <input
            value={draft.name}
            maxLength={80}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <label>
          Permission / recording rights
          <input
            value={draft.rights}
            maxLength={500}
            placeholder="My voice, speaker consent, or license reference"
            onChange={(e) => setDraft({ ...draft, rights: e.target.value })}
          />
        </label>
        <DurationField
          label="Example duration in seconds (optional override)"
          min={6}
          max={30}
          value={draft.duration}
          onChange={(duration) => setDraft({ ...draft, duration })}
          help="Leave blank for automatic duration. If this browser cannot decode the example, enter its duration; the local service verifies the file before generation."
        />
        <label>
          Voice example (MP3 / WAV, max 5 MB)
          <input
            type="file"
            disabled={draft.busy}
            accept="audio/mpeg,audio/wav,.mp3,.wav"
            onChange={(e) => {
              const input = e.currentTarget;
              const file = input.files?.[0];
              if (file)
                void reference(file).finally(() => {
                  input.value = "";
                });
            }}
          />
        </label>
      </details>
      {voice.reference && (
        <>
          <audio controls preload="metadata" src={voice.reference.data} />
          <button
            type="button"
            disabled={draft.busy}
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
      <fieldset>
        <legend>Generation defaults</legend>
        {(
          [
            ["pitch", "Pitch (semitones)", -12, 12, 1],
            ["temperature", "Variation / temperature", 0.1, 2, 0.05],
            ["exaggeration", "Expressiveness", 0, 2, 0.05],
            ["cfgWeight", "Voice guidance", 0, 1, 0.05],
            ["seed", "Random seed", 0, 2147483647, 1],
          ] as const
        ).map(([field, label, min, max, step]) => (
          <label
            key={field}
            title={
              voice.model === "nano" && (field === "cfgWeight" || field === "exaggeration")
                ? "This parameter is available with Multilingual V3; Nano does not support it."
                : `Set the default ${label.toLowerCase()} for generated speech.`
            }
          >
            {label}
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              disabled={
                voice.model === "nano" && (field === "cfgWeight" || field === "exaggeration")
              }
              value={settings[field]}
              onChange={(e) => change(field, Number(e.target.value))}
            />
          </label>
        ))}
      </fieldset>
      <p className="editor-hint">
        Speed and volume apply immediately to the audio preview. Regenerate to hear changes to pitch
        or generation defaults.
      </p>
      {draft.error && <p role="alert">{draft.error}</p>}
    </section>
  );
}
