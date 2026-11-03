import { NarrationModeSelect } from "./NarrationModeSelect.tsx";
import { useEffect, useRef, useState } from "react";
import { StoryProjectSchema } from "../../contracts/editor-project.ts";
import type { StoryProject } from "../../contracts/editor-project.ts";
import { NarrationClipSchema } from "../../contracts/media.ts";
import { EditorDialog } from "./EditorDialog.tsx";
import { requestLocalNarration } from "../media/local-narration.ts";
import { textDigest } from "../media/narration-manager.ts";
import { attachNarration, narrationBytes, audioDuration } from "./narration-authoring.ts";
import { VoiceDesigner } from "./VoiceDesigner.tsx";
import { speechOptions } from "../media/speech-options.ts";

export function NarrationDialog({
  project,
  locale,
  onApply,
  onClose,
}: {
  project: StoryProject;
  locale: string;
  onApply: (next: StoryProject) => void;
  onClose: () => void;
}) {
  const [language, setLanguage] = useState(structuredClone(project.languages[locale]!));
  const [segment, setSegment] = useState("");
  const [status, setStatus] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [recording, setRecording] = useState({
    rights: "",
    marks: "[]",
    duration: 0,
    spokenText: null as string | null,
  });
  const { rights, marks, duration: manualDuration, spokenText } = recording;
  const scope = useRef(new AbortController());
  const previewAudio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (previewAudio.current) {
      previewAudio.current.playbackRate = language.defaults.narrationRate ?? 1;
      previewAudio.current.volume = language.defaults.volumes?.narration ?? 0.8;
    }
  }, [audioUrl, language.defaults.narrationRate, language.defaults.volumes?.narration]);
  useEffect(() => () => scope.current.abort(), []);
  const segments = [
    ...language.script.matchAll(/^(.+?)\s+#\s*(?:passage:[^#]+#\s*)?segment:([a-z][a-z0-9.-]*)/gm),
  ].map((m) => ({ text: m[1]!, id: m[2]! }));
  const sourceSegment = segments.find((s) => s.id === segment);
  const selected = sourceSegment
    ? { ...sourceSegment, text: spokenText ?? sourceSegment.text }
    : undefined;
  const { voice } = voiceSelection(language);
  async function generate() {
    if (!selected || !voice) return;
    setStatus("Generating local preview… cached audio is reused when text and voice match.");
    const result = await requestLocalNarration(
      {
        storyId: project.storyId,
        locale,
        segmentId: selected.id,
        text: selected.text,
        voiceId: voice,
        ...(await speechOptions(
          voice,
          language.configuration.voiceProfiles,
          language.configuration.speechSettings,
        )),
      },
      scope.current.signal,
      true,
    );
    if (scope.current.signal.aborted) return;
    if (!result) {
      setStatus(
        "Local Chatterbox is unavailable. Start scripts/start-local.ps1; supported local languages are English and French.",
      );
      return;
    }
    try {
      const response = await fetch(result.audioUrl, {
        signal: scope.current.signal,
        redirect: "error",
        credentials: "same-origin",
      });
      if (!response.ok || Number(response.headers.get("content-length")) > 5_000_000)
        throw new Error("Could not cache generated narration.");
      const { audioDigest, dataUrl } = await narrationBytes(await response.arrayBuffer());
      if (
        audioDigest !== result.clip.audioDigest ||
        (await textDigest(selected.text)) !== result.clip.spokenTextDigest
      )
        throw new Error("Generated narration does not match its text or audio digest.");
      setLanguage((current) => attachNarration(current, result.clip, dataUrl));
      setAudioUrl(dataUrl);
      setStatus(
        "Preview cached in this project. Human listening review is required before publication.",
      );
    } catch (error) {
      if (!scope.current.signal.aborted)
        setStatus(error instanceof Error ? error.message : String(error));
    }
  }
  async function upload(file: File) {
    try {
      if (!selected) throw new Error("Choose the narrative segment first.");
      if (!rights.trim()) throw new Error("Record your rights attestation before uploading.");
      if (file.size > 5_000_000 || !file.name.toLowerCase().endsWith(".mp3"))
        throw new Error("Upload an MP3 smaller than 5 MB.");
      const bytes = await file.arrayBuffer();
      const { audioDigest: hex, dataUrl } = await narrationBytes(bytes);
      const durationMs = manualDuration ? manualDuration * 1000 : await audioDuration(dataUrl);
      const assetId = `recording.${hex}`;
      const clip = NarrationClipSchema.parse({
        segmentId: selected.id,
        locale,
        voiceId: voice || "human",
        spokenTextDigest: await textDigest(selected.text),
        assetId,
        audioDigest: hex,
        durationMs,
        marks: JSON.parse(marks),
        approval: { status: "preview", reviewer: "author-upload", rightsReference: rights },
      });
      setLanguage((current) =>
        attachNarration({ ...current, narrationMode: "human" }, clip, dataUrl),
      );
      setAudioUrl(dataUrl);
      setStatus(
        "Human recording attached as a preview. Timing marks are optional; without them the reader uses progressive text.",
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }
  return (
    <EditorDialog title="TTS / Narration" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            onApply(
              StoryProjectSchema.parse({
                ...project,
                languages: { ...project.languages, [locale]: language },
              }),
            );
            onClose();
          } catch (error) {
            setStatus(error instanceof Error ? error.message : String(error));
          }
        }}
      >
        <NarrationModeSelect
          value={language.narrationMode}
          onChange={(mode) => setLanguage({ ...language, narrationMode: mode })}
        />
        <p>
          Provider: local Chatterbox · Model:{" "}
          {({ en: "Nano / Multilingual V3", fr: "Multilingual V3" } as Record<string, string>)[
            locale
          ] ?? "local model unavailable"}{" "}
          · Language: {locale}
        </p>
        <VoiceDesigner language={language} locale={locale} onChange={setLanguage} />
        <VoiceControls language={language} onChange={setLanguage} />
        <label>
          Narrative segment
          <select
            value={segment}
            onChange={(e) => {
              setSegment(e.target.value);
              setRecording({ ...recording, spokenText: null });
            }}
          >
            <option value="">Choose text</option>
            {segments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.text.slice(0, 70)}
              </option>
            ))}
          </select>
        </label>
        {selected && (
          <label>
            Spoken text (verify dynamic Ink in Preview)
            <textarea
              value={selected.text}
              onChange={(e) => setRecording({ ...recording, spokenText: e.target.value })}
            />
          </label>
        )}
        {language.narrationMode.startsWith("ai-") && (
          <button
            type="button"
            disabled={!selected || !voice}
            onClick={() => {
              void generate();
            }}
          >
            Generate / preview audio
          </button>
        )}
        {language.narrationMode === "human" && (
          <>
            <label>
              Rights attestation
              <input
                value={rights}
                onChange={(e) => setRecording({ ...recording, rights: e.target.value })}
                placeholder="I own this recording, or license reference"
              />
            </label>
            <label>
              Text/audio marks JSON
              <textarea
                value={marks}
                onChange={(e) => setRecording({ ...recording, marks: e.target.value })}
                placeholder='[{"character":0,"startMs":0,"endMs":500}]'
              />
            </label>
            <label>
              Upload MP3
              <input
                type="file"
                accept="audio/mpeg,.mp3"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                }}
              />
            </label>
            <label>
              Duration in seconds (optional override)
              <input
                type="number"
                min="0"
                max="180"
                step="0.01"
                value={manualDuration}
                onChange={(e) => setRecording({ ...recording, duration: Number(e.target.value) })}
              />
            </label>
          </>
        )}
        {audioUrl && (
          <audio aria-label="Narration preview" ref={previewAudio} controls src={audioUrl} />
        )}
        {status && <p role="status">{status}</p>}
        <p className="editor-hint">
          Generated and uploaded clips remain previews until listening review. Backups embed
          uploaded recordings; library media retain licensed file references.
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
function VoiceControls({
  language,
  onChange,
}: {
  language: Language;
  onChange: (language: Language) => void;
}) {
  const { voices, selectedVoices } = voiceSelection(language);
  return (
    <>
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
      <label>
        Speed
        <input
          type="number"
          min="0.5"
          max="2"
          step="0.1"
          value={language.defaults.narrationRate ?? 1}
          onChange={(e) =>
            onChange({
              ...language,
              defaults: { ...language.defaults, narrationRate: Number(e.target.value) },
            })
          }
        />
      </label>
      <label>
        Volume
        <input
          type="number"
          min="0"
          max="1"
          step="0.05"
          value={language.defaults.volumes?.narration ?? 0.8}
          onChange={(e) =>
            onChange({
              ...language,
              defaults: {
                ...language.defaults,
                volumes: {
                  sfx: 0.65,
                  ambience: 0.3,
                  music: 0.3,
                  ...language.defaults.volumes,
                  narration: Number(e.target.value),
                },
              },
            })
          }
        />
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={language.defaults.narration ?? false}
          onChange={(e) =>
            onChange({
              ...language,
              defaults: { ...language.defaults, narration: e.target.checked },
            })
          }
        />
        Narrate by default
      </label>
    </>
  );
}
