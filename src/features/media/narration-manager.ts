import type { Frame, StoryBundle } from "../../contracts/story.ts";
import type { NarrationClip, NarrationProgress } from "../../contracts/media.ts";
import { AudioManager } from "./audio-manager.ts";
import type { PlaybackResult } from "./audio-manager.ts";
import { requestLocalNarration } from "./local-narration.ts";
import { speechOptions } from "./speech-options.ts";
import { narrationCharacters } from "./narration-progress.ts";
interface NarrationOptions {
  rate: number;
  deviceVoice: boolean;
  beforeSegment?: (id: string, signal: AbortSignal) => Promise<void>;
  settings?: () => { rate: number; voiceId: string };
}

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
  private readonly editorPreview: boolean;
  constructor(audio: AudioManager, editorPreview = false) {
    this.audio = audio;
    this.editorPreview = editorPreview;
  }
  stop() {
    this.scope?.abort();
    this.audio.stopChannel("narration");
    this.audio.setDucking(false);
  }
  async play(
    frame: Frame,
    bundle: StoryBundle,
    options: NarrationOptions,
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
        await options.beforeSegment?.(segment.id, scope.signal);
        if (scope.signal.aborted) return "aborted";
        const result = await this.playSegment(segment, bundle, options, scope.signal, onProgress);
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
  private async playSegment(
    segment: Frame["segments"][number],
    bundle: StoryBundle,
    options: NarrationOptions,
    signal: AbortSignal,
    onProgress: (progress: NarrationProgress) => void,
  ): Promise<PlaybackResult> {
    const settings = options.settings?.() ?? { rate: options.rate, voiceId: "" };
    if (
      settings.voiceId.startsWith("device:") &&
      options.deviceVoice &&
      bundle.narrationMode !== "disabled" &&
      bundle.narrationMode !== "human" &&
      bundle.narrationMode !== "ai-pregenerated"
    )
      return this.speak(segment, bundle.locale, settings.rate, signal, onProgress, {
        uri: settings.voiceId.slice(7),
        pitch: bundle.speechSettings?.pitch,
      });
    let result: PlaybackResult = "unavailable";
    for (const source of await this.recordings(segment, bundle, settings.voiceId, signal)) {
      result = await this.recorded(
        source.clip,
        segment.text,
        source.audioUrl,
        settings.rate,
        signal,
        onProgress,
      );
      if (result === "ended" || result === "aborted") return result;
    }
    if (
      bundle.narrationMode !== "disabled" &&
      bundle.narrationMode !== "human" &&
      bundle.narrationMode !== "ai-pregenerated" &&
      options.deviceVoice &&
      !signal.aborted
    )
      return this.speak(segment, bundle.locale, settings.rate, signal, onProgress);
    return result;
  }
  private async recordings(
    segment: Frame["segments"][number],
    bundle: StoryBundle,
    voiceId: string,
    signal: AbortSignal,
  ) {
    const digest = await textDigest(segment.text);
    const options = await speechOptions(voiceId, bundle.voiceProfiles, bundle.speechSettings);
    const sources: { clip: NarrationClip; audioUrl: string }[] = [];
    if (bundle.narrationMode === "disabled") return sources;
    const clip = bundle.narration?.find(
      (clip) =>
        clip.segmentId === segment.id &&
        clip.locale === bundle.locale &&
        clip.spokenTextDigest === digest &&
        (!options.settingsKey ||
          clip.assetId.startsWith("recording.") ||
          clip.settingsKey === options.settingsKey) &&
        (!voiceId || clip.voiceId === voiceId) &&
        (bundle.narratorVoiceSelection === undefined ||
          bundle.narratorVoiceSelection.includes(clip.voiceId)),
    );
    const asset = bundle.assets?.find(
      (asset) => asset.id === clip?.assetId && asset.type === "audio",
    );
    if (clip && asset)
      sources.push({
        clip,
        audioUrl:
          bundle.embeddedAudio?.[asset.id] ??
          `${import.meta.env.BASE_URL}stories/${bundle.storyId}/${asset.path}`,
      });
    const local =
      !sources.length && voiceId && (!bundle.narrationMode || bundle.narrationMode === "ai-live")
        ? await requestLocalNarration(
            {
              storyId: bundle.storyId,
              locale: bundle.locale,
              segmentId: segment.id,
              text: segment.text,
              voiceId,
              ...options,
            },
            signal,
            this.editorPreview,
          )
        : null;
    if (local && local.clip.spokenTextDigest === digest) sources.push(local);
    return sources;
  }
  private speak(
    segment: Frame["segments"][number],
    locale: string,
    rate: number,
    signal: AbortSignal,
    onProgress: (progress: NarrationProgress) => void,
    selection?: { uri: string; pitch?: number },
  ) {
    return this.audio.speak(
      segment.text,
      locale,
      rate,
      signal,
      (index, length) => {
        let end = index + length;
        while (end < segment.text.length && !/\s/.test(segment.text[end]!)) end++;
        onProgress({ segmentId: segment.id, characters: end, done: false });
      },
      selection,
    ).finished;
  }
  private async recorded(
    clip: NarrationClip,
    text: string,
    audioUrl: string,
    rate: number,
    signal: AbortSignal,
    onProgress: (progress: NarrationProgress) => void,
  ): Promise<PlaybackResult> {
    if (clip.marks.some((mark) => mark.character > text.length)) return "unavailable";
    let url: string | undefined;
    try {
      const response = await fetch(audioUrl, {
        signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
        redirect: "error",
        credentials: "same-origin",
      });
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
          onProgress({
            segmentId: clip.segmentId,
            characters: narrationCharacters(clip, text.length, seconds),
            done: false,
          });
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
