import type { StoryProject } from "../../contracts/editor-project.ts";
import type { NarrationClip } from "../../contracts/media.ts";
import { sha256, textDigest } from "../../contracts/digest.ts";
import { encodeDataUrl } from "../../contracts/story-archive.ts";
import { sameOriginFetch } from "../../contracts/same-origin-fetch.ts";

export async function cacheNarration(
  result: { clip: NarrationClip; audioUrl: string },
  text: string,
  signal: AbortSignal,
) {
  const response = await sameOriginFetch(result.audioUrl, { signal, maxBytes: 5_000_000 });
  if (!response.ok) throw new Error("Could not cache generated narration.");
  const cached = await narrationBytes(await response.arrayBuffer());
  if (
    cached.audioDigest !== result.clip.audioDigest ||
    (await textDigest(text)) !== result.clip.spokenTextDigest
  )
    throw new Error("Generated narration does not match its text or audio digest.");
  return cached.dataUrl;
}
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
  const dataUrl = await encodeDataUrl(
    new Blob([bytes], { type: "audio/mpeg" }),
    "Could not read narration audio.",
  );
  return { audioDigest: await sha256(bytes), dataUrl };
}
