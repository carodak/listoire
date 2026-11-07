import { useEffect, useState } from "react";
import type { StoryProject } from "../../contracts/editor-project.ts";

type Language = StoryProject["languages"][string];
interface DeviceVoicesProps {
  language: Language;
  locale: string;
  onChange: (language: Language) => void;
}

export function DeviceVoices({ language, locale, onChange }: DeviceVoicesProps) {
  const voices = useDeviceVoices(locale);
  const [status, setStatus] = useState("");
  const selected = language.defaults.narratorVoice?.startsWith("device:")
    ? language.defaults.narratorVoice.slice(7)
    : "";
  return (
    <details>
      <summary title="Real voices installed on this device, independent of Chatterbox. Names and availability depend on the operating system.">
        More narrators · device voices ({locale.toUpperCase()})
      </summary>
      <label>
        Narrator
        <select
          aria-label="Device narrator"
          value={selected}
          onChange={(event) =>
            onChange({
              ...language,
              defaults: {
                ...language.defaults,
                narratorVoice: event.target.value ? `device:${event.target.value}` : undefined,
                deviceVoice: true,
              },
            })
          }
        >
          <option value="">Use AI / recorded narrator</option>
          {voices.map((voice) => (
            <option key={voice.voiceURI} value={voice.voiceURI}>
              {voice.name} · {voice.lang}
              {voice.localService ? " · offline" : ""}
            </option>
          ))}
        </select>
      </label>
      {!voices.length && (
        <p>
          No {locale.toUpperCase()} voices are installed in this browser. Install male/female voices
          in your system speech settings, or add an authorized example to Chatterbox above.
        </p>
      )}
      <button
        type="button"
        disabled={!selected}
        onClick={() =>
          previewVoice(
            voices.find((voice) => voice.voiceURI === selected),
            locale,
            language,
            setStatus,
          )
        }
      >
        Preview selected narrator
      </button>
      <p role="status">{status}</p>
    </details>
  );
}

function useDeviceVoices(locale: string) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    const synth = globalThis.speechSynthesis;
    if (!synth) return;
    const update = () =>
      setVoices(
        synth
          .getVoices()
          .filter((voice) =>
            voice.lang.toLowerCase().startsWith(locale.toLowerCase().split("-")[0]!),
          ),
      );
    update();
    synth.addEventListener("voiceschanged", update);
    return () => {
      synth.removeEventListener("voiceschanged", update);
      synth.cancel();
    };
  }, [locale]);
  return voices;
}

function previewVoice(
  voice: SpeechSynthesisVoice | undefined,
  locale: string,
  language: Language,
  setStatus: (status: string) => void,
) {
  const synth = globalThis.speechSynthesis;
  if (!synth || !voice) return;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(
    locale.startsWith("fr")
      ? "Le vent balayait la plaine. Une silhouette attendait près de la maison."
      : "The wind swept across the plain. A silhouette waited beside the house.",
  );
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = language.defaults.narrationRate ?? 1;
  utterance.pitch = Math.pow(2, (language.configuration.speechSettings?.pitch ?? 0) / 12);
  utterance.onend = () => setStatus("Preview complete");
  utterance.onerror = () => setStatus("Voice unavailable on this device");
  setStatus("Speaking…");
  synth.speak(utterance);
}
