import { useEffect, useRef, useState } from "react";
import { message } from "../../contracts/error-message.ts";
import type { StoryProject } from "../../contracts/editor-project.ts";
import type { NarrationClip } from "../../contracts/media.ts";
import { attachNarration } from "./narration-authoring.ts";
import { generateNarrationPreview, readHumanRecording } from "./narration-sources.ts";
import { Field, TextareaField, uploadChosenFile } from "./Fields.tsx";
type Language = StoryProject["languages"][string];
interface Props {
  storyId: string;
  locale: string;
  language: Language;
  onChange: (change: Language | ((current: Language) => Language)) => void;
}
interface Segment {
  id: string;
  text: string;
}
const initialRecording = {
  rights: "",
  marks: "[]",
  duration: 0,
  spokenText: null as string | null,
};
type Recording = typeof initialRecording;
export function NarrationRecorder({ storyId, locale, language, onChange }: Props) {
  const { preview, patch, perform, cancelRequest, getSignal, bindAudio } = useNarrationPreview(
    language,
    onChange,
  );
  const { segment, recording, audioUrl, status, busy } = preview;
  const segments = scriptSegments(language.script);
  const source = segments.find((item) => item.id === segment),
    selected = source ? { ...source, text: recording.spokenText ?? source.text } : undefined;
  const voice = narratorVoice(language);
  return (
    <fieldset disabled={busy} className="narration-recorder">
      <NarrationSegment
        segments={segments}
        selected={segment}
        spokenText={selected?.text}
        onSelect={(segment) => {
          cancelRequest();
          patch({ segment, recording: { ...recording, spokenText: null } });
        }}
        onText={(spokenText) => patch({ recording: { ...recording, spokenText } })}
      />
      {language.narrationMode.startsWith("ai-") && (
        <button
          type="button"
          disabled={!selected || !voice || language.defaults.narratorVoice?.startsWith("device:")}
          onClick={() =>
            void perform(
              generateNarrationPreview(storyId, locale, language, selected, voice, getSignal()),
              false,
            )
          }
        >
          Generate / preview audio
        </button>
      )}
      {language.narrationMode === "human" && (
        <HumanRecordingFields
          recording={recording}
          onChange={(recording) => patch({ recording })}
          onUpload={(file) =>
            perform(readHumanRecording(file, locale, selected, voice, recording), true)
          }
        />
      )}
      {audioUrl && <audio aria-label="Narration preview" ref={bindAudio} controls src={audioUrl} />}
      {status && <p role="status">{status}</p>}
    </fieldset>
  );
}
function useNarrationPreview(language: Language, onChange: Props["onChange"]) {
  const [preview, setPreview] = useState({
    segment: "",
    status: "",
    audioUrl: "",
    busy: false,
    recording: initialRecording,
  });
  const handles = useRef({ scope: new AbortController(), generation: 0 });
  const bindAudio = usePreviewAudio(language, preview.audioUrl);
  useEffect(() => {
    const scope = new AbortController();
    handles.current.scope = scope;
    return () => scope.abort();
  }, []);
  const patch = (change: Partial<typeof preview>) =>
    setPreview((current) => ({ ...current, ...change }));
  const isCurrent = (request: number) =>
    request === handles.current.generation && !handles.current.scope.signal.aborted;
  async function perform(task: Promise<{ clip: NarrationClip; dataUrl: string }>, human: boolean) {
    const request = ++handles.current.generation;
    patch({ busy: true, status: "Preparing narration preview..." });
    try {
      const result = await task;
      if (!isCurrent(request)) return;
      onChange((current) =>
        attachNarration(
          human ? { ...current, narrationMode: "human" } : current,
          result.clip,
          result.dataUrl,
        ),
      );
      patch({
        audioUrl: result.dataUrl,
        status: human
          ? "Human recording attached as a preview. Timing marks are optional."
          : "Preview cached in this project. Human listening review is required before publication.",
      });
    } catch (error) {
      if (isCurrent(request)) patch({ status: message(error) });
    } finally {
      if (isCurrent(request)) patch({ busy: false });
    }
  }
  return {
    preview,
    patch,
    perform,
    cancelRequest: () => {
      handles.current.generation++;
    },
    getSignal: () => handles.current.scope.signal,
    bindAudio,
  };
}
function usePreviewAudio(language: Language, audioUrl: string) {
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (!audio.current) return;
    audio.current.playbackRate = language.defaults.narrationRate ?? 1;
    audio.current.volume = language.defaults.volumes?.narration ?? 0.8;
  }, [audioUrl, language.defaults.narrationRate, language.defaults.volumes?.narration]);
  useEffect(() => {
    const node = audio;
    return () => node.current?.pause();
  }, []);
  return (node: HTMLAudioElement | null) => {
    audio.current = node;
  };
}
function scriptSegments(script: string): Segment[] {
  return [
    ...script.matchAll(/^(.+?)\s+#\s*(?:passage:[^#]+#\s*)?segment:([a-z][a-z0-9.-]*)/gm),
  ].map((match) => ({ text: match[1]!, id: match[2]! }));
}
function narratorVoice(language: Language) {
  const voices =
    language.configuration.narratorVoiceSelection ??
    language.configuration.narratorVoices?.map((voice) => voice.id) ??
    [];
  return voices.includes(language.defaults.narratorVoice ?? "")
    ? language.defaults.narratorVoice!
    : (voices[0] ?? "");
}
function NarrationSegment({
  segments,
  selected,
  spokenText,
  onSelect,
  onText,
}: {
  segments: Segment[];
  selected: string;
  spokenText?: string;
  onSelect: (id: string) => void;
  onText: (text: string) => void;
}) {
  return (
    <>
      <label>
        Narrative segment
        <select value={selected} onChange={(event) => onSelect(event.target.value)}>
          <option value="">Choose text</option>
          {segments.map((segment) => (
            <option key={segment.id} value={segment.id}>
              {segment.id} / {segment.text.slice(0, 70)}
            </option>
          ))}
        </select>
      </label>
      {spokenText !== undefined && (
        <TextareaField
          label="Spoken text (verify dynamic Ink in Preview)"
          value={spokenText}
          onChange={(event) => onText(event.target.value)}
        />
      )}
    </>
  );
}
interface HumanRecordingFieldsProps {
  recording: Recording;
  onChange: (value: Recording) => void;
  onUpload: (file: File) => Promise<void>;
}

function HumanRecordingFields({
  recording,
  onChange: setRecording,
  onUpload: upload,
}: HumanRecordingFieldsProps) {
  const { rights, marks } = recording;
  return (
    <>
      <Field
        label="Rights attestation"
        value={rights}
        onChange={(e) => setRecording({ ...recording, rights: e.target.value })}
        placeholder="I own this recording, or license reference"
      />
      <TextareaField
        label="Text/audio marks JSON"
        value={marks}
        onChange={(e) => setRecording({ ...recording, marks: e.target.value })}
        placeholder='[{"character":0,"startMs":0,"endMs":500}]'
      />
      <Field
        label="Upload MP3"
        type="file"
        accept="audio/mpeg,.mp3"
        onChange={uploadChosenFile(upload)}
      />
      <Field
        label="Duration in seconds (optional override)"
        type="number"
        min="0"
        max="180"
        step="0.01"
        value={recording.duration}
        onChange={(e) => setRecording({ ...recording, duration: Number(e.target.value) })}
      />
    </>
  );
}
