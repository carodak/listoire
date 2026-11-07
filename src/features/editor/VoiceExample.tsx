import { useEffect, useRef, useState } from "react";
import type { VoiceProfile } from "../../contracts/media.ts";
import { VoiceProfileSchema } from "../../contracts/media.ts";
import { audioDuration } from "./narration-authoring.ts";
import { DurationField } from "./DurationField.tsx";
import { Field } from "./Fields.tsx";
interface Draft {
  name: string;
  rights: string;
  duration: number;
  error: string;
  busy: boolean;
}
interface Props {
  model: VoiceProfile["model"];
  count: number;
  onAdd: (profile: VoiceProfile) => void;
  onBusy: (busy: boolean) => void;
}
export function VoiceExample({ model, count, onAdd, onBusy }: Props) {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [draft, setDraft] = useState<Draft>({
    name: "",
    rights: "",
    duration: 0,
    error: "",
    busy: false,
  });
  async function upload(file: File) {
    onBusy(true);
    setDraft((current) => ({ ...current, busy: true, error: "" }));
    try {
      if (count >= 8) throw new Error("A language can have up to eight voices.");
      const profile = await readExample(file, draft, model);
      if (!mounted.current) return;
      onAdd(profile);
      setDraft({ name: "", rights: "", duration: 0, error: "", busy: false });
    } catch (error) {
      setDraft((current) => ({
        ...current,
        busy: false,
        error: error instanceof Error ? error.message : String(error),
      }));
    } finally {
      onBusy(false);
    }
  }
  return (
    <details>
      <summary title="Condition a distinct voice using a recording you have permission to use.">
        Add a voice from an example
      </summary>
      <p>
        Voice conditioning uses a recording; model weights stay unchanged. Maximum 5 MB and 30
        seconds. Prefer 6–15 seconds of clear speech.
      </p>
      <ExampleFields
        draft={draft}
        onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        onUpload={upload}
      />
      {draft.error && <p role="alert">{draft.error}</p>}
    </details>
  );
}
function ExampleFields({
  draft,
  onChange,
  onUpload,
}: {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  onUpload: (file: File) => Promise<void>;
}) {
  return (
    <fieldset disabled={draft.busy}>
      <Field
        label="Voice name"
        value={draft.name}
        maxLength={80}
        onChange={(event) => onChange({ name: event.target.value })}
      />
      <Field
        label="Permission / recording rights"
        value={draft.rights}
        maxLength={500}
        placeholder="My voice, speaker consent, or license reference"
        onChange={(event) => onChange({ rights: event.target.value })}
      />
      <DurationField
        label="Example duration in seconds (optional override)"
        min={6}
        max={30}
        value={draft.duration}
        onChange={(duration) => onChange({ duration })}
        help="Leave blank for automatic duration. If decoding is unavailable, enter the duration; the local service verifies the recording."
      />
      <Field
        label="Voice example (MP3 / WAV, max 5 MB)"
        type="file"
        accept="audio/mpeg,audio/wav,.mp3,.wav"
        onChange={(event) => {
          const input = event.currentTarget,
            file = input.files?.[0];
          if (file)
            void onUpload(file).finally(() => {
              input.value = "";
            });
        }}
      />
    </fieldset>
  );
}
async function readExample(file: File, draft: Draft, model: VoiceProfile["model"]) {
  if (!draft.name.trim() || !draft.rights.trim())
    throw new Error("Name the voice and confirm permission to use its recording first.");
  if (file.size > 5_000_000 || !/\.(mp3|wav)$/i.test(file.name))
    throw new Error("Use an MP3 or WAV up to 5 MB and 30 seconds.");
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
  return VoiceProfileSchema.parse({
    id: `voice.${crypto.randomUUID()}`,
    label: draft.name,
    model,
    reference: { name: file.name, data, rights: draft.rights },
  });
}
