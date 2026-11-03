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
  previousImage?: string;
  paused: boolean;
  blocking: boolean;
  voice: "off" | "playing" | "paused" | "ended" | "unavailable";
  progress: Record<string, number>;
  synchronized: boolean;
  revealAll: boolean;
  layers: { id: string; effect: ReactBitsEffect }[];
}
export class PresentationSession implements NarrativePresentationPort {
  private readonly bundle: StoryBundle;
  private preferences: ReadingPreferences;
  readonly audio: AudioManager;
  private readonly narration: NarrationManager;
  private readonly effects = new EffectsEngine();
  private readonly clock = new PresentationClock();
  private scope = new AbortController();
  private readonly listeners = new Set<() => void>();
  private frame: Frame | null = null;
  private targets: EffectTargets | null = null;
  private readonly issued = new Set<string>();
  private blocking = 0;
  private restored = false;
  private skipped = false;
  private generation = 0;
  private voiceRequest = 0;
  private state: PresentationState = {
    paused: false,
    blocking: false,
    voice: "off",
    progress: {},
    synchronized: false,
    revealAll: false,
    layers: [],
  };
  constructor(bundle: StoryBundle, preferences: ReadingPreferences, audio = new AudioManager()) {
    this.bundle = bundle;
    this.preferences = preferences;
    this.audio = audio;
    this.narration = new NarrationManager(audio);
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
    this.blocking = 0;
    this.publish({
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
      revealAll: restored,
      layers: [],
    });
    if (!restored) {
      this.queue("passage");
      if (this.preferences.narration) this.replayNarration();
    }
  }
  configure(preferences: ReadingPreferences) {
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
      this.publish({ voice: "off", revealAll: true });
    }
    if (!voiceWasEnabled && preferences.narration && this.frame) this.replayNarration();
  }
  bind(targets: EffectTargets) {
    this.targets = targets;
    if (!this.restored) this.queue("passage");
    return () => {
      if (this.targets === targets) {
        this.targets = null;
        this.effects.stop();
      }
    };
  }
  segmentRevealed = (id: string) => {
    if (!this.restored) this.queue("segment", id);
  };
  private queue(kind: "passage" | "segment", segmentId?: string) {
    if (!this.frame || this.skipped) return;
    const events = this.bundle.scenes?.[this.frame.passageId]?.events ?? [];
    for (const event of events) {
      if (
        event.trigger.kind !== kind ||
        (kind === "segment" && event.trigger.segmentId !== segmentId) ||
        this.issued.has(event.id)
      )
        continue;
      if (event.action.kind === "effect" && !this.targets) continue;
      this.issued.add(event.id);
      if (event.blocking) {
        this.blocking++;
        this.publish({ blocking: true });
      }
      this.clock.schedule(() => this.dispatch(event), event.delayMs ?? 0);
    }
  }
  private done(event: NarrativeEvent, generation: number) {
    if (generation !== this.generation) return;
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
      this.done(event, generation);
      return;
    }
    if (action.kind === "audio") {
      this.playAudio(event);
      this.done(event, generation);
      return;
    }
    const reduced =
      typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (action.effect.id.startsWith("react-bits.")) {
      if (!reduced)
        this.publish({ layers: [{ id: event.id, effect: action.effect as ReactBitsEffect }] });
      this.clock.schedule(
        () => {
          this.publish({ layers: [] });
          this.done(event, generation);
        },
        reduced ? 0 : action.effect.duration,
      );
      return;
    }
    if (!this.targets) {
      this.done(event, generation);
      return;
    }
    const playback = this.effects.play(
      action.effect as NativeEffect,
      this.targets,
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
    if (action.channel !== "sfx" && action.fadeMs)
      this.audio.crossfade(
        action.channel,
        url,
        this.scope.signal,
        action.fadeMs,
        action.volume ?? 1,
        action.loop ?? false,
      );
    else
      this.audio.play({
        url,
        channel: action.channel,
        signal: this.scope.signal,
        loop: action.loop,
        gain: action.volume ?? 1,
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
        },
        this.scope.signal,
        (progress) => {
          if (!current() || this.state.paused) return;
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
        if (current())
          this.publish({
            voice: result === "ended" ? "ended" : "unavailable",
            revealAll: result !== "ended",
          });
      })
      .catch(() => {
        if (current()) this.publish({ voice: "unavailable", revealAll: true });
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
    this.publish({ blocking: false, layers: [], previousImage: undefined });
  };
  cancel() {
    this.generation++;
    this.scope.abort();
    this.clock.clear();
    this.effects.stop();
    this.narration.stop();
    this.audio.stopAll();
    this.targets = null;
    this.publish({ blocking: false, layers: [], voice: "off" });
  }
  dispose() {
    this.cancel();
    this.audio.dispose();
    this.listeners.clear();
  }
}
