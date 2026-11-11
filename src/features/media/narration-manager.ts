import { allowsDeviceVoice } from "../../contracts/presentation.ts";
import type { Frame, StoryBundle } from "../../contracts/story.ts";
import type { NarrationProgress } from "../../contracts/media.ts";
import { AudioManager } from "./audio-manager.ts";
import type { PlaybackResult } from "./audio-manager.ts";
import { findRecording, playRecording } from "./narration-clips.ts";
import { isFullscreenMedia } from "../../contracts/presentation.ts";
interface NarrationOptions {
  rate: number;
  deviceVoice: boolean;
  beforeSegment?: (id: string, signal: AbortSignal) => Promise<void>;
  settings?: () => { rate: number; voiceId: string };
  /** True while a reached paragraph waits for its clip (live generation), false when it can play. */
  onPreparing?: (preparing: boolean) => void;
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
    options = {
      ...options,
      deviceVoice: options.deviceVoice && allowsDeviceVoice(bundle.narrationMode),
    };
    const scope = new AbortController();
    this.scope = scope;
    const stop = () => scope.abort();
    signal.addEventListener("abort", stop, { once: true });
    if (signal.aborted) stop();
    try {
      const settings = options.settings?.();
      if (
        settings?.voiceId.startsWith("device:") &&
        options.deviceVoice &&
        !bundle.scenes?.[frame.passageId]?.blocks?.some(isFullscreenMedia)
      ) {
        await options.beforeSegment?.(frame.segments[0]?.id ?? "", scope.signal);
        return await this.speakPage(frame, bundle, settings, scope.signal, onProgress);
      }
      return await this.playSegments(frame, bundle, options, scope.signal, onProgress);
    } finally {
      signal.removeEventListener("abort", stop);
      if (this.scope === scope) {
        this.audio.setDucking(false);
        this.scope = null;
      }
    }
  }
  private async playSegments(
    frame: Frame,
    bundle: StoryBundle,
    options: NarrationOptions,
    signal: AbortSignal,
    onProgress: (progress: NarrationProgress) => void,
  ): Promise<PlaybackResult> {
    const prepared = new Map<string, ReturnType<typeof findRecording>>();
    const prepare = (segment: Frame["segments"][number], voiceId: string) => {
      const key = `${segment.id}:${voiceId}`;
      let pending = prepared.get(key);
      if (!pending) {
        pending = voiceId.startsWith("device:")
          ? Promise.resolve(undefined)
          : findRecording(segment, bundle, voiceId, signal, this.editorPreview).catch(
              () => undefined,
            );
        prepared.set(key, pending);
      }
      return pending;
    };
    const voice = () => options.settings?.().voiceId ?? "";
    // Ask for the whole page now, in order and one at a time (the local generator makes one
    // clip at a time), so later paragraphs are ready when the reader reaches them.
    let queue: Promise<unknown> = Promise.resolve();
    for (const segment of frame.segments) {
      const voiceId = voice();
      queue = queue.then(() => prepare(segment, voiceId));
    }
    for (const segment of frame.segments) {
      const voiceId = voice();
      const sources = prepare(segment, voiceId);
      await options.beforeSegment?.(segment.id, signal);
      if (signal.aborted) return "aborted";
      // Only a wait the reader can notice is announced.
      const notice = setTimeout(() => options.onPreparing?.(true), 400);
      const ready = await sources;
      clearTimeout(notice);
      options.onPreparing?.(false);
      if (signal.aborted) return "aborted";
      const result = await this.playSegment(segment, bundle, options, signal, onProgress, {
        voiceId,
        sources: ready,
      });
      prepared.delete(`${segment.id}:${voiceId}`);
      if (signal.aborted) return "aborted";
      onProgress({ segmentId: segment.id, characters: segment.text.length, done: true });
      if (result !== "ended") return result;
    }
    return "ended";
  }
  private async speakPage(
    frame: Frame,
    bundle: StoryBundle,
    settings: { rate: number; voiceId: string },
    signal: AbortSignal,
    progress: (progress: NarrationProgress) => void,
  ): Promise<PlaybackResult> {
    let offset = 0;
    let completed = 0;
    const spans = frame.segments.map((segment) => {
      const span = { ...segment, start: offset };
      offset += segment.text.length + 1;
      return span;
    });
    this.audio.setDucking(true);
    const playback = this.audio.speak(
      spans.map((segment) => segment.text).join(" "),
      bundle.locale,
      settings.rate,
      signal,
      (index, length) => {
        while (
          completed < spans.length &&
          index >= spans[completed]!.start + spans[completed]!.text.length
        ) {
          const segment = spans[completed++]!;
          progress({ segmentId: segment.id, characters: segment.text.length, done: true });
        }
        const segment = spans[completed];
        if (segment)
          progress({
            segmentId: segment.id,
            characters: Math.max(0, Math.min(segment.text.length, index - segment.start + length)),
            done: false,
          });
      },
      { uri: settings.voiceId.slice(7), pitch: bundle.speechSettings?.pitch },
    );
    const result = await playback;
    if (result === "ended")
      for (const segment of spans.slice(completed))
        progress({ segmentId: segment.id, characters: segment.text.length, done: true });
    return result;
  }
  private async playSegment(
    segment: Frame["segments"][number],
    bundle: StoryBundle,
    options: NarrationOptions,
    signal: AbortSignal,
    onProgress: (progress: NarrationProgress) => void,
    prepared: { voiceId: string; sources: Awaited<ReturnType<typeof findRecording>> },
  ): Promise<PlaybackResult> {
    const settings = options.settings?.() ?? { rate: options.rate, voiceId: "" };
    if (settings.voiceId.startsWith("device:") && options.deviceVoice)
      return this.speak(segment, bundle.locale, settings.rate, signal, onProgress, {
        uri: settings.voiceId.slice(7),
        pitch: bundle.speechSettings?.pitch,
      });
    let result: PlaybackResult = "unavailable";
    const source =
      prepared.voiceId === settings.voiceId
        ? prepared.sources
        : await findRecording(segment, bundle, settings.voiceId, signal, this.editorPreview);
    if (source) {
      result = await playRecording(
        this.audio,
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
      options.deviceVoice &&
      !signal.aborted &&
      // Never silently replace an expressly selected AI narrator with a system
      // voice. The UI should instead show the narration service as unavailable.
      (!settings.voiceId || settings.voiceId.startsWith("device:"))
    )
      return this.speak(segment, bundle.locale, settings.rate, signal, onProgress);
    return result;
  }
  private speak(
    segment: Frame["segments"][number],
    locale: string,
    rate: number,
    signal: AbortSignal,
    onProgress: (progress: NarrationProgress) => void,
    selection?: { uri: string; pitch?: number },
  ) {
    this.audio.setDucking(true);
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
    );
  }
}
