import type { NarrativePresentationPort } from "../../contracts/presentation-port.ts";
import type { Frame, StoryBundle } from "../../contracts/story.ts";
import type { ReadingPreferences } from "../../contracts/presentation.ts";
import type { NarrativeEvent, NativeEffect, ReactBitsEffect } from "../../contracts/effects.ts";
import { AudioManager } from "../media/audio-manager.ts";
import { NarrationManager } from "../media/narration-manager.ts";
import { EffectsEngine } from "./effects.ts";
import type { EffectTargets } from "./effects.ts";
import { PresentationClock } from "./presentation-clock.ts";

interface PresentationState {
  departed: boolean;
  exiting: boolean;
  completedBlocks: string[];
  textComplete: boolean;
  previousImage?: string;
  paused: boolean;
  blocking: boolean;
  voice: "off" | "playing" | "paused" | "ended" | "unavailable";
  progress: Record<string, number>;
  synchronized: boolean;
  revealAll: boolean;
  layers: { id: string; blockId?: string; effect: ReactBitsEffect }[];
  visibleMedia: string[];
  expiredMedia: string[];
}
function matchesTrigger(trigger: NarrativeEvent["trigger"], kind: string, id?: string) {
  if (trigger.kind !== kind) return false;
  if (kind === "segment") return trigger.segmentId === id;
  if (kind === "block") return trigger.blockId === id;
  return true;
}
export class PresentationSession implements NarrativePresentationPort {
  private readonly bundle: StoryBundle;
  private preferences: ReadingPreferences;
  readonly audio: AudioManager;
  readonly voices: { id: string; label: string }[];
  private readonly narration: NarrationManager;
  private readonly effects = new EffectsEngine();
  private readonly clock = new PresentationClock();
  private scope = new AbortController();
  private readonly backgroundScope = new AbortController();
  private readonly backgroundTracks = new Map<string, string>();
  private readonly listeners = new Set<() => void>();
  private frame: Frame | null = null;
  private readonly targets = new Map<string, EffectTargets>();
  private readonly pendingBlocks = new Map<string, number>();
  private readonly revealedSegments = new Set<string>();
  private readonly reachedSegments = new Set<string>();
  private readonly segmentWaiters = new Map<string, Set<() => void>>();
  private readonly issued = new Set<string>();
  private blocking = 0;
  private restored = false;
  private skipped = false;
  private generation = 0;
  private voiceRequest = 0;
  private state: PresentationState = {
    departed: false,
    exiting: false,
    completedBlocks: [],
    textComplete: false,
    paused: false,
    blocking: false,
    voice: "off",
    progress: {},
    synchronized: false,
    revealAll: false,
    layers: [],
    visibleMedia: [],
    expiredMedia: [],
  };
  constructor(bundle: StoryBundle, preferences: ReadingPreferences, audio = new AudioManager()) {
    this.bundle = bundle;
    this.voices = (bundle.narratorVoices ?? []).filter(
      (voice) =>
        (bundle.narratorVoiceSelection === undefined ||
          bundle.narratorVoiceSelection.includes(voice.id)) &&
        (import.meta.env.DEV || bundle.narration?.some((clip) => clip.voiceId === voice.id)),
    );
    this.preferences = preferences;
    this.audio = audio;
    this.narration = new NarrationManager(audio);
    this.configure(preferences);
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(change: Partial<PresentationState>) {
    this.state = { ...this.state, ...change };
    this.listeners.forEach((listener) => listener());
  }
  start(frame: Frame, _occurrenceId: string, restored: boolean) {
    const previousImage = this.frame
      ? this.bundle.scenes?.[this.frame.passageId]?.image
      : undefined;
    this.cancel();
    this.scope = new AbortController();
    this.frame = frame;
    this.restored = restored;
    this.skipped = false;
    this.issued.clear();
    this.pendingBlocks.clear();
    this.revealedSegments.clear();
    this.reachedSegments.clear();
    this.blocking = 0;
    this.publish({
      departed: false,
      exiting: false,
      completedBlocks: [],
      textComplete: restored || this.preferences.reveal === "instant" || this.reducedMotion(),
      blocking: false,
      voice: "off",
      progress: {},
      synchronized: false,
      previousImage:
        !restored &&
        this.bundle.scenes?.[frame.passageId]?.events?.some(
          (event) => event.action.kind === "effect" && event.action.effect.id === "crossfade",
        )
          ? previousImage
          : undefined,
      revealAll: restored || this.preferences.reveal === "instant" || this.reducedMotion(),
      layers: [],
      visibleMedia: [],
      expiredMedia: [],
    });
    if (!restored) {
      this.skipped = this.preferences.reveal === "instant";
      this.queue("passage");
      if (this.preferences.narration) this.replayNarration();
    }
    for (const block of this.bundle.scenes?.[frame.passageId]?.blocks ?? [])
      if (block.kind === "media" && block.show?.kind !== "segment")
        this.showMedia(block.id, block.show?.delayMs ?? 0);
  }
  configure(preferences: ReadingPreferences) {
    if (this.bundle.narrationMode === "disabled")
      preferences = { ...preferences, narration: false };
    const voiceWasEnabled = this.preferences.narration;
    const soundWasEnabled = this.preferences.sound;
    this.preferences = preferences;
    const volumes = preferences.volumes ?? { sfx: 0.65, ambience: 0.3, music: 0.3, narration: 0.8 };
    for (const channel of ["sfx", "ambience", "music", "narration"] as const)
      this.audio.setVolume(channel, volumes[channel]);
    this.audio.setRate(preferences.narrationRate ?? 1);
    if (soundWasEnabled && !preferences.sound)
      for (const channel of ["sfx", "ambience", "music"] as const) this.audio.stopChannel(channel);
    if (voiceWasEnabled && !preferences.narration) {
      this.voiceRequest++;
      this.narration.stop();
      this.revealRemaining();
      this.publish({ voice: "off", revealAll: true });
    }
    if (!voiceWasEnabled && preferences.narration && this.frame) this.replayNarration();
  }
  bind(targets: EffectTargets, blockId = "scene") {
    this.targets.set(blockId, targets);
    if (!this.restored) {
      this.queue("passage");
      for (const id of this.revealedSegments) this.queue("segment", id);
      const block = this.bundle.scenes?.[this.frame?.passageId ?? ""]?.blocks?.find(
        (block) => block.kind === "media" && block.id === blockId,
      );
      if (
        !block ||
        block.kind !== "media" ||
        !block.show ||
        this.state.visibleMedia.includes(blockId)
      )
        this.queue("block", blockId);
    }
    return () => {
      if (this.targets.get(blockId) === targets) this.targets.delete(blockId);
    };
  }
  bindPage(element: HTMLElement) {
    this.targets.set("page", { canvas: element });
    this.targets.set("scene", { canvas: element });
    if (!this.restored) this.queue("passage");
    if (!this.restored)
      this.effects.play(
        { id: "fade-in", duration: 160, target: "canvas" },
        { canvas: element },
        this.scope.signal,
        this.reducedMotion(),
      );
    return () => {
      if (this.targets.get("page")?.canvas === element) this.targets.delete("page");
      if (this.targets.get("scene")?.canvas === element) this.targets.delete("scene");
    };
  }
  async leave() {
    const targets = this.targets.get("page");
    if (!targets || this.state.departed) return;
    this.publish({ exiting: true });
    const transitions =
      this.bundle.scenes?.[this.frame?.passageId ?? ""]?.events?.flatMap((event) =>
        event.phase === "exit" &&
        event.action.kind === "effect" &&
        event.action.effect.id === "fade-out"
          ? [event.action.effect]
          : [],
      ) ?? [];
    const effects = transitions.length
      ? transitions
      : [{ id: "fade-out" as const, duration: 160, target: "canvas" as const }];
    await Promise.all(
      effects.map(
        (effect) =>
          this.effects.play(effect, targets, this.scope.signal, this.reducedMotion()).finished,
      ),
    );
    this.publish({ departed: true });
  }
  private reducedMotion() {
    return (
      typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }
  segmentRevealed = (id: string) => {
    this.revealedSegments.add(id);
    if (
      !this.state.textComplete &&
      this.frame?.segments.every((segment) => this.revealedSegments.has(segment.id))
    )
      this.publish({ textComplete: true });
    if (!this.restored) this.queue("segment", id);
  };
  segmentReached(id: string) {
    this.reachedSegments.add(id);
    this.segmentWaiters.get(id)?.forEach((resolve) => resolve());
    if (!this.preferences.narration) this.showSegmentMedia(id);
  }
  private showSegmentMedia(id: string) {
    for (const block of this.bundle.scenes?.[this.frame?.passageId ?? ""]?.blocks ?? [])
      if (block.kind === "media" && block.show?.kind === "segment" && block.show.segmentId === id)
        this.showMedia(block.id, block.show.delayMs ?? 0);
  }
  private showMedia(id: string, delay: number) {
    if (this.issued.has(`show:${id}`)) return;
    this.issued.add(`show:${id}`);
    this.clock.schedule(() => {
      this.publish({ visibleMedia: [...this.state.visibleMedia, id] });
      this.queue("block", id);
      const block = this.bundle.scenes?.[this.frame?.passageId ?? ""]?.blocks?.find(
        (b) => b.kind === "media" && b.id === id,
      );
      if (block?.kind === "media" && block.durationMs)
        this.clock.schedule(
          () => this.publish({ expiredMedia: [...this.state.expiredMedia, id] }),
          block.durationMs,
        );
    }, delay);
  }
  private waitForSegment = (id: string, signal: AbortSignal) => {
    if (signal.aborted || this.reachedSegments.has(id)) return Promise.resolve();
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
  private queue(kind: "passage" | "segment" | "block", targetId?: string) {
    if (!this.frame || this.skipped) return;
    const events = this.bundle.scenes?.[this.frame.passageId]?.events ?? [];
    for (const event of events) {
      if (event.phase === "exit") continue;
      if (!matchesTrigger(event.trigger, kind, targetId) || this.issued.has(event.id)) continue;
      if (event.action.kind === "effect" && !this.targets.has(event.blockId ?? "scene")) continue;
      this.issue(event);
    }
  }
  private issue(event: NarrativeEvent) {
    this.issued.add(event.id);
    if (event.blockId)
      this.pendingBlocks.set(event.blockId, (this.pendingBlocks.get(event.blockId) ?? 0) + 1);
    if (event.blocking) {
      this.blocking++;
      this.publish({ blocking: true });
    }
    this.clock.schedule(() => this.dispatch(event), event.delayMs ?? 0);
  }
  private done(event: NarrativeEvent, generation: number) {
    if (generation !== this.generation) return;
    if (event.blockId) {
      const pending = Math.max(0, (this.pendingBlocks.get(event.blockId) ?? 1) - 1);
      this.pendingBlocks.set(event.blockId, pending);
      if (!pending)
        this.publish({ completedBlocks: [...this.state.completedBlocks, event.blockId] });
    }
    if (event.action.kind === "effect" && event.action.effect.id === "crossfade")
      this.publish({ previousImage: undefined });
    if (event.blocking) {
      this.blocking = Math.max(0, this.blocking - 1);
      this.publish({ blocking: this.blocking > 0 });
    }
  }
  private dispatch(event: NarrativeEvent) {
    const generation = this.generation;
    const action = event.action;
    if (this.scope.signal.aborted) return;
    if (action.kind === "stop-audio") {
      this.audio.stopChannel(action.channel);
      this.backgroundTracks.delete(action.channel);
      this.done(event, generation);
      return;
    }
    if (action.kind === "audio") {
      this.playAudio(event);
      this.done(event, generation);
      return;
    }
    const reduced = this.reducedMotion();
    if (action.effect.id.startsWith("react-bits.")) {
      if (!reduced)
        this.publish({
          layers: [
            ...this.state.layers,
            { id: event.id, blockId: event.blockId, effect: action.effect as ReactBitsEffect },
          ],
        });
      this.clock.schedule(
        () => {
          this.publish({ layers: this.state.layers.filter((layer) => layer.id !== event.id) });
          this.done(event, generation);
        },
        reduced ? 0 : action.effect.duration,
      );
      return;
    }
    const targets = this.targets.get(event.blockId ?? "scene");
    if (!targets) {
      this.done(event, generation);
      return;
    }
    const playback = this.effects.play(
      action.effect as NativeEffect,
      targets,
      this.scope.signal,
      reduced,
    );
    void playback.finished.then(() => this.done(event, generation));
  }
  private playAudio(event: NarrativeEvent) {
    if (event.action.kind !== "audio" || !this.preferences.sound) return;
    const action = event.action;
    const asset = this.bundle.assets?.find(
      (asset) => asset.id === action.assetId && asset.type === "audio",
    );
    if (!asset) return;
    const url = `${import.meta.env.BASE_URL}stories/${this.bundle.storyId}/${asset.path}`;
    const persistent = this.bundle.authored && action.channel !== "sfx";
    const signature = JSON.stringify(action);
    if (persistent && this.backgroundTracks.get(action.channel) === signature) return;
    if (persistent) this.backgroundTracks.set(action.channel, signature);
    const signal = persistent ? this.backgroundScope.signal : this.scope.signal;
    const playback =
      action.channel !== "sfx" && action.fadeMs
        ? this.audio.crossfade(
            action.channel,
            url,
            signal,
            action.fadeMs,
            action.volume ?? 1,
            action.loop ?? false,
          )
        : this.audio.play({
            url,
            channel: action.channel,
            signal,
            loop: action.loop,
            gain: action.volume ?? 1,
            fadeMs: action.fadeMs,
          });
    if (persistent)
      void playback.finished.then(() => {
        if (this.backgroundTracks.get(action.channel) === signature)
          this.backgroundTracks.delete(action.channel);
      });
  }
  replayNarration = () => {
    if (!this.frame || !this.preferences.narration) return;
    const generation = this.generation;
    const request = ++this.voiceRequest;
    const current = () => generation === this.generation && request === this.voiceRequest;
    this.publish({
      voice: this.state.paused ? "paused" : "playing",
      progress: {},
      synchronized: false,
    });
    void this.narration
      .play(
        this.frame,
        this.bundle,
        {
          rate: this.preferences.narrationRate ?? 1,
          deviceVoice: this.preferences.deviceVoice ?? true,
          beforeSegment: this.waitForSegment,
          settings: () => ({
            rate: this.preferences.narrationRate ?? 1,
            voiceId:
              this.voices.find((voice) => voice.id === this.preferences.narratorVoice)?.id ??
              this.voices[0]?.id ??
              "",
          }),
        },
        this.scope.signal,
        (progress) => {
          if (!current()) return;
          if (progress.characters > 0 || progress.done) this.showSegmentMedia(progress.segmentId);
          this.publish({
            progress: {
              ...this.state.progress,
              [progress.segmentId]: Math.max(
                this.state.progress[progress.segmentId] ?? 0,
                progress.characters,
              ),
            },
            synchronized: this.state.synchronized || !progress.done,
          });
        },
      )
      .then((result) => {
        if (current()) {
          if (result !== "ended") this.revealRemaining();
          this.publish({
            voice: result === "ended" ? "ended" : "unavailable",
            revealAll: result !== "ended",
          });
        }
      })
      .catch(() => {
        if (current()) {
          this.revealRemaining();
          this.publish({ voice: "unavailable", revealAll: true });
        }
      });
  };
  pause = () => {
    this.audio.pause();
    this.audio.setDucking(false);
    this.effects.pause();
    this.clock.pause();
    this.publish({
      paused: true,
      voice: this.state.voice === "playing" ? "paused" : this.state.voice,
    });
  };
  resume = () => {
    this.audio.resume();
    this.effects.resume();
    this.clock.resume();
    const voice = this.state.voice === "paused" ? "playing" : this.state.voice;
    this.audio.setDucking(voice === "playing");
    this.publish({ paused: false, voice });
    if (this.restored && this.preferences.narration && voice === "off") this.replayNarration();
  };
  skipCinematic = () => {
    this.skipped = true;
    this.clock.clear();
    this.effects.stop();
    this.audio.stopChannel("sfx");
    this.blocking = 0;
    this.publish({
      blocking: false,
      layers: [],
      previousImage: undefined,
      completedBlocks:
        this.bundle.scenes?.[this.frame?.passageId ?? ""]?.blocks
          ?.filter((block) => block.kind === "media")
          .map((block) => block.id) ?? [],
    });
  };
  revealRemaining = () => {
    this.skipCinematic();
    this.publish({ revealAll: true });
    this.publish({
      visibleMedia:
        this.bundle.scenes?.[this.frame?.passageId ?? ""]?.blocks
          ?.filter((b) => b.kind === "media")
          .map((b) => b.id) ?? [],
    });
  };
  cancel() {
    this.generation++;
    this.scope.abort();
    this.clock.clear();
    this.effects.stop();
    this.narration.stop();
    if (this.bundle.authored) this.audio.stopChannel("sfx");
    else this.audio.stopAll();
    this.targets.clear();
    this.publish({ blocking: false, layers: [], voice: "off" });
  }
  dispose() {
    this.cancel();
    this.backgroundScope.abort();
    this.audio.dispose();
    this.listeners.clear();
  }
}
