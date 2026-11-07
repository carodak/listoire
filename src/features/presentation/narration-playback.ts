import type { PlaybackResult } from "../media/audio-manager.ts";
import type { AudioManager } from "../media/audio-manager.ts";
import { NarrationManager } from "../media/narration-manager.ts";
import type { PlaybackContext } from "./playback-context.ts";
import type { ScenePlayback } from "./scene-playback.ts";
export class NarrationPlayback {
  readonly voices: { id: string; label: string }[];
  private readonly context: PlaybackContext;
  private readonly scene: ScenePlayback;
  private readonly narration: NarrationManager;
  private voiceRequest = 0;
  private readonly segmentWaiters = new Map<string, Set<() => void>>();
  constructor(
    context: PlaybackContext,
    scene: ScenePlayback,
    audio: AudioManager,
    editorPreview: boolean,
  ) {
    this.context = context;
    this.scene = scene;
    this.narration = new NarrationManager(audio, editorPreview);
    const bundle = context.bundle;
    this.voices = (bundle.narratorVoices ?? []).filter(
      (voice) =>
        (bundle.narratorVoiceSelection === undefined ||
          bundle.narratorVoiceSelection.includes(voice.id)) &&
        (import.meta.env.DEV || bundle.narration?.some((clip) => clip.voiceId === voice.id)),
    );
  }
  configure(wasEnabled: boolean | undefined) {
    if (wasEnabled && !this.context.preferences.narration) {
      this.stop();
      this.scene.revealRemaining();
      this.context.publish({ voice: "off", revealAll: true });
    }
    if (!wasEnabled && this.context.preferences.narration && this.context.frame)
      this.replayNarration();
  }
  resume() {
    if (
      this.context.restored &&
      this.context.preferences.narration &&
      this.context.state.voice === "off"
    )
      this.replayNarration();
  }
  stop() {
    this.voiceRequest++;
    this.narration.stop();
  }
  segmentRevealed = (id: string) => {
    this.context.revealedSegments.add(id);
    if (
      !this.context.state.textComplete &&
      this.context.frame?.segments.every((segment) => this.context.revealedSegments.has(segment.id))
    )
      this.context.publish({ textComplete: true });
    if (!this.context.restored && !this.hasNarrationClock()) this.scene.queue("segment", id);
  };
  segmentReached(id: string) {
    this.context.reachedSegments.add(id);
    this.segmentWaiters.get(id)?.forEach((resolve) => resolve());
    if (!this.hasNarrationClock()) {
      this.scene.showSegmentMedia(id);
      if (!this.context.restored) this.scene.queue("segment", id);
    }
  }
  private waitForSegment = (id: string, signal: AbortSignal) => {
    if (signal.aborted || this.context.reachedSegments.has(id)) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const done = () => {
        signal.removeEventListener("abort", done);
        this.segmentWaiters.get(id)?.delete(done);
        resolve();
      };
      if (!this.segmentWaiters.has(id)) this.segmentWaiters.set(id, new Set());
      this.segmentWaiters.get(id)!.add(done);
      signal.addEventListener("abort", done, { once: true });
    });
  };
  replayNarration = () => {
    if (!this.context.frame || !this.context.preferences.narration) return;
    const generation = this.context.generation;
    const request = ++this.voiceRequest;
    const current = () => generation === this.context.generation && request === this.voiceRequest;
    this.context.publish({
      voice: this.context.state.paused ? "paused" : "playing",
      progress: {},
      synchronized: false,
    });
    void this.narration
      .play(
        this.context.frame,
        this.context.bundle,
        {
          rate: this.context.preferences.narrationRate ?? 1,
          deviceVoice: this.context.preferences.deviceVoice ?? true,
          beforeSegment: this.waitForSegment,
          settings: () => ({
            rate: this.context.preferences.narrationRate ?? 1,
            voiceId:
              (this.context.preferences.narratorVoice?.startsWith("device:")
                ? this.context.preferences.narratorVoice
                : undefined) ??
              this.voices.find((voice) => voice.id === this.context.preferences.narratorVoice)
                ?.id ??
              this.voices[0]?.id ??
              "",
          }),
        },
        this.context.scope.signal,
        (progress) => {
          if (!current()) return;
          this.activateSegment(progress.segmentId);
          this.context.publish({
            progress: {
              ...this.context.state.progress,
              [progress.segmentId]: Math.max(
                this.context.state.progress[progress.segmentId] ?? 0,
                progress.characters,
              ),
            },
            synchronized: this.context.state.synchronized || !progress.done,
          });
        },
      )
      .then((result) => {
        if (current()) this.finish(result);
      })
      .catch(() => {
        if (current()) this.finish("error");
      });
  };
  private hasNarrationClock() {
    return this.context.preferences.narration && this.context.state.voice !== "unavailable";
  }
  private activateSegment(id: string) {
    this.scene.showSegmentMedia(id);
    if (!this.context.restored) this.scene.queue("segment", id);
  }
  private finish(result: PlaybackResult) {
    this.context.publish({
      voice: result === "ended" ? "ended" : "unavailable",
      ...(result !== "ended" ? { synchronized: false } : {}),
    });
    if (result !== "ended") {
      for (const segment of this.context.reachedSegments) this.activateSegment(segment);
    }
  }
}
