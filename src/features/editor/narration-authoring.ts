import type { StoryProject } from "../../contracts/editor-project.ts";
import type { NarrationClip } from "../../contracts/media.ts";
export function audioDuration(url: string, kind: "audio" | "video" = "audio"): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio =
      kind === "video"
        ? Object.assign(document.createElement("video"), { src: url })
        : new Audio(url);
    const finish = (error?: string) => {
      clearTimeout(timer);
      const duration = audio.duration * 1000;
      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.removeAttribute("src");
      audio.load();
      if (error || !Number.isFinite(duration))
        reject(new Error(error ?? "Could not read the recording duration."));
      else resolve(duration);
    };
    const timer = setTimeout(
      () => finish("Audio metadata timed out. Use a decodable MP3 or WAV."),
      10000,
    );
    audio.onloadedmetadata = () => finish();
    audio.onerror = () => finish("This file could not be decoded as audio.");
  });
}
export function attachNarration(
  language: StoryProject["languages"][string],
  clip: NarrationClip,
  dataUrl: string,
) {
  return {
    ...language,
    configuration: {
      ...language.configuration,
      assets: [
        ...(language.configuration.assets ?? []).filter((a) => a.id !== clip.assetId),
        {
          id: clip.assetId,
          path: `media/${clip.assetId}.mp3`,
          type: "audio" as const,
          alt: "Narration recording",
        },
      ],
      narration: [
        ...(language.configuration.narration ?? []).filter(
          (c) => c.segmentId !== clip.segmentId || c.voiceId !== clip.voiceId,
        ),
        clip,
      ],
      embeddedAudio: { ...language.configuration.embeddedAudio, [clip.assetId]: dataUrl },
    },
  };
}
export async function narrationBytes(bytes: ArrayBuffer) {
  if (bytes.byteLength > 5_000_000) throw new Error("Narration clips must be smaller than 5 MB.");
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const audioDigest = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read narration audio."));
    reader.readAsDataURL(new Blob([bytes], { type: "audio/mpeg" }));
  });
  return { audioDigest, dataUrl };
}
