import type { Frame, StoryBundle } from "../../contracts/story.ts";
import type { NarrationClip, NarrationProgress } from "../../contracts/media.ts";
import { AudioManager } from "./audio-manager.ts";
import type { PlaybackResult } from "./audio-manager.ts";

export async function textDigest(text: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text.normalize("NFC")),
  );
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join(
    "",
  );
}

export class NarrationManager {
  private readonly audio: AudioManager;
  private scope: AbortController | null = null;
  constructor(audio: AudioManager) {
    this.audio = audio;
  }
  stop() {
    this.scope?.abort();
    this.audio.stopChannel("narration");
    this.audio.setDucking(false);
  }
  async play(
    frame: Frame,
    bundle: StoryBundle,
    options: { rate: number; deviceVoice: boolean },
    signal: AbortSignal,
    onProgress: (progress: NarrationProgress) => void,
  ): Promise<PlaybackResult> {
    this.stop();
    const scope = new AbortController();
    this.scope = scope;
    const stop = () => scope.abort();
    signal.addEventListener("abort", stop, { once: true });
    if (signal.aborted) stop();
    this.audio.setDucking(true);
    try {
      for (const segment of frame.segments) {
        if (scope.signal.aborted) return "aborted";
        const digest = await textDigest(segment.text);
        const clip = bundle.narration?.find(
          (clip) =>
            clip.segmentId === segment.id &&
            clip.locale === bundle.locale &&
            clip.spokenTextDigest === digest,
        );
        let result: PlaybackResult = "unavailable";
        if (clip)
          result = await this.recorded(
            clip,
            segment.text,
            bundle,
            options.rate,
            scope.signal,
            onProgress,
          );
        if (
          result !== "ended" &&
          result !== "aborted" &&
          options.deviceVoice &&
          !scope.signal.aborted
        ) {
          const playback = this.audio.speak(
            segment.text,
            bundle.locale,
            options.rate,
            scope.signal,
            (index, length) => {
              let end = index + length;
              while (end < segment.text.length && !/\s/.test(segment.text[end]!)) end++;
              onProgress({ segmentId: segment.id, characters: end, done: false });
            },
          );
          result = await playback.finished;
        }
        if (scope.signal.aborted) return "aborted";
        onProgress({ segmentId: segment.id, characters: segment.text.length, done: true });
        if (result !== "ended") return result;
      }
      return "ended";
    } finally {
      signal.removeEventListener("abort", stop);
      if (this.scope === scope) {
        this.audio.setDucking(false);
        this.scope = null;
      }
    }
  }
  private async recorded(
    clip: NarrationClip,
    text: string,
    bundle: StoryBundle,
    rate: number,
    signal: AbortSignal,
    onProgress: (progress: NarrationProgress) => void,
  ): Promise<PlaybackResult> {
    const asset = bundle.assets?.find(
      (asset) => asset.id === clip.assetId && asset.type === "audio",
    );
    if (!asset || clip.marks.some((mark) => mark.character > text.length)) return "unavailable";
    let url: string | undefined;
    try {
      const response = await fetch(
        `${import.meta.env.BASE_URL}stories/${bundle.storyId}/${asset.path}`,
        {
          signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
          redirect: "error",
          credentials: "same-origin",
        },
      );
      if (!response.ok || Number(response.headers.get("content-length")) > 10000000) return "error";
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > 10000000) return "error";
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      if (
        Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join(
          "",
        ) !== clip.audioDigest
      )
        return "error";
      if (signal.aborted) return "aborted";
      url = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
      const playback = this.audio.play({
        url,
        channel: "narration",
        signal,
        rate,
        maxMs: clip.durationMs / rate + 5000,
        onTime: (seconds) => {
          const mark = clip.marks.filter((mark) => mark.startMs <= seconds * 1000).at(-1);
          if (mark)
            onProgress({ segmentId: clip.segmentId, characters: mark.character, done: false });
        },
      });
      return await playback.finished;
    } catch {
      return signal.aborted ? "aborted" : "error";
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  }
}
