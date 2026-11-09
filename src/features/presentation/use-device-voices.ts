import { useEffect, useState } from "react";

export function useDeviceVoices(locale: string, enabled = true) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    const synth = globalThis.speechSynthesis;
    if (!enabled || !synth) return;
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
    return () => synth.removeEventListener("voiceschanged", update);
  }, [locale, enabled]);
  return enabled ? voices : [];
}
