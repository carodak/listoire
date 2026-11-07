import type { ReadingPreferences } from "../../contracts/presentation.ts";
import { mediaIsVisible } from "../../contracts/presentation.ts";
import type { NarrativeEvent, NativeEffect, ReactBitsEffect } from "../../contracts/effects.ts";
import { EffectsEngine } from "./effects.ts";
import type { EffectTargets } from "./effects.ts";
import { PresentationClock } from "./presentation-clock.ts";
import { SceneAudio } from "./scene-audio.ts";
import type { AudioManager } from "../media/audio-manager.ts";
import type { PlaybackContext } from "./playback-context.ts";
function matchesTrigger(trigger: NarrativeEvent["trigger"], kind: string, id?: string) {
  if (trigger.kind !== kind) return false;
  if (kind === "segment") return trigger.segmentId === id;
  if (kind === "block") return trigger.blockId === id;
  return true;
}
export class ScenePlayback {
  private readonly context: PlaybackContext;
  private readonly audio: AudioManager;
  private readonly sceneAudio: SceneAudio;
  private readonly effects = new EffectsEngine();
  private readonly clock = new PresentationClock();
  private readonly targets = new Map<string, EffectTargets>();
  private readonly pendingBlocks = new Map<string, number>();
  private readonly issued = new Set<string>();
  private readonly videos = new Set<HTMLVideoElement>();
  private blocking = 0;
  constructor(context: PlaybackContext, audio: AudioManager) {
    this.context = context;
    this.audio = audio;
    this.sceneAudio = new SceneAudio(context.bundle, audio);
  }
  beginFrame() {
    this.issued.clear();
    this.pendingBlocks.clear();
    this.blocking = 0;
  }
  configure(preferences: ReadingPreferences, wasEnabled: boolean | undefined) {
    const volumes = preferences.volumes ?? { sfx: 0.65, ambience: 0.3, music: 0.3, narration: 0.8 };
    for (const channel of ["sfx", "ambience", "music", "narration"] as const)
      this.audio.setVolume(channel, volumes[channel]);
    this.audio.setRate(preferences.narrationRate ?? 1);
    this.configureVideos(preferences);
    if (wasEnabled && !preferences.sound)
      for (const channel of ["sfx", "ambience", "music"] as const) this.audio.stopChannel(channel);
  }
  private configureVideos(preferences: ReadingPreferences) {
    for (const target of this.targets.values()) setVideoSound(target, preferences);
  }
  pause() {
    this.videos.forEach((video) => video.pause());
    this.effects.pause();
    this.clock.pause();
    this.audio.pause();
    this.audio.setDucking(false);
    const voice = this.context.state.voice;
    this.context.publish({ paused: true, voice: voice === "playing" ? "paused" : voice });
  }
  resume() {
    for (const [id, target] of this.targets)
      if (target.video && this.mediaVisible(id) && (!target.silentVideo || !this.reducedMotion()))
        void target.video.play().catch(() => {});
    this.effects.resume();
    this.clock.resume();
    this.audio.resume();
    const voice = this.context.state.voice === "paused" ? "playing" : this.context.state.voice;
    this.audio.setDucking(voice === "playing");
    this.context.publish({ paused: false, voice });
  }
  resetAudio() {
    this.sceneAudio.reset();
    this.audio.resume();
    this.clock.resume();
  }
  dispose() {
    this.sceneAudio.dispose();
  }
  bind(targets: EffectTargets, blockId = "scene") {
    const loaded = () => this.queueTarget(blockId);
    this.targets.set(blockId, targets);
    if (targets.video) {
      this.videos.add(targets.video);
      setVideoSound(targets, this.context.preferences);
      if ((!this.context.restored || targets.silentVideo) && targets.video.readyState < 2)
        targets.video.addEventListener("loadeddata", loaded, {
          once: true,
          signal: this.context.scope.signal,
        });
    }
    if (!this.context.restored || targets.silentVideo) this.queueTarget(blockId);
    return () => {
      if (targets.video) {
        targets.video.removeEventListener("loadeddata", loaded);
        targets.video.pause();
        this.videos.delete(targets.video);
      }
      if (this.targets.get(blockId) === targets) this.targets.delete(blockId);
    };
  }
  private mediaVisible(id: string) {
    const block = this.context.bundle.scenes?.[this.context.frame?.passageId ?? ""]?.blocks?.find(
      (block) => block.kind === "media" && block.id === id,
    );
    return block?.kind === "media"
      ? mediaIsVisible(block, this.context.state)
      : !this.context.state.expiredMedia.includes(id);
  }
  private queueTarget(id: string) {
    if (!this.mediaVisible(id)) return;
    if (!this.context.restored) this.startPersistence(id);
    const target = this.targets.get(id);
    const video = target?.video;
    if (
      video &&
      video.readyState >= 2 &&
      (!this.context.restored || target.silentVideo) &&
      !this.context.state.paused &&
      !this.reducedMotion() &&
      !this.context.state.completedBlocks.includes(id)
    )
      void video.play().catch(() => {});
    if (this.context.restored) return;
    this.queue("passage");
    for (const segment of this.context.queuedSegments) this.queue("segment", segment);
    this.queue("block", id);
  }
  bindPage(element: HTMLElement) {
    this.targets.set("page", { canvas: element });
    this.targets.set("scene", { canvas: element });
    if (!this.context.restored) this.queue("passage");
    if (!this.context.restored)
      this.effects.play(
        { id: "fade-in", duration: 160, target: "canvas" },
        { canvas: element },
        this.context.scope.signal,
        this.reducedMotion(),
      );
    return () => {
      if (this.targets.get("page")?.canvas === element) this.targets.delete("page");
      if (this.targets.get("scene")?.canvas === element) this.targets.delete("scene");
    };
  }
  async leave(direction: "forward" | "back" = "forward") {
    const targets = this.targets.get("page");
    if (!targets || this.context.state.departed) return;
    this.context.publish({ exiting: true });
    const transitions =
      this.context.bundle.scenes?.[this.context.frame?.passageId ?? ""]?.events?.flatMap((event) =>
        event.phase === "exit" &&
        event.action.kind === "effect" &&
        event.action.effect.id === "fade-out"
          ? [event.action.effect]
          : [],
      ) ?? [];
    const effects: NativeEffect[] = transitions.length
      ? transitions
      : this.context.preferences.pageTurn
        ? [{ id: "page-turn", duration: 650, direction, target: "canvas" }]
        : [{ id: "fade-out" as const, duration: 160, target: "canvas" as const }];
    await Promise.all(
      effects.map(
        (effect) =>
          this.effects.play(effect, targets, this.context.scope.signal, this.reducedMotion())
            .finished,
      ),
    );
    this.context.publish({ departed: true });
  }
  reducedMotion() {
    return (
      typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }
  showSegmentMedia(id: string) {
    for (const block of this.context.bundle.scenes?.[this.context.frame?.passageId ?? ""]?.blocks ??
      [])
      if (block.kind === "media" && block.show?.kind === "segment" && block.show.segmentId === id)
        this.showMedia(block.id, block.show.delayMs ?? 0);
  }
  showMedia(id: string, delay: number) {
    if (this.issued.has(`show:${id}`)) return;
    this.issued.add(`show:${id}`);
    this.clock.schedule(() => {
      this.context.publish({ visibleMedia: [...this.context.state.visibleMedia, id] });
      this.queueTarget(id);
    }, delay);
  }
  private startPersistence(id: string) {
    if (!this.targets.has(id) || this.issued.has(`expire:${id}`)) return;
    const block = this.context.bundle.scenes?.[this.context.frame?.passageId ?? ""]?.blocks?.find(
      (block) => block.kind === "media" && block.id === id,
    );
    if (block?.kind !== "media" || !block.durationMs || block.layout === "fullscreen") return;
    this.issued.add(`expire:${id}`);
    this.clock.schedule(() => {
      this.targets.get(id)?.video?.pause();
      this.context.publish({ expiredMedia: [...this.context.state.expiredMedia, id] });
    }, block.durationMs);
  }
  queue(kind: "passage" | "segment" | "block", targetId?: string) {
    if (!this.context.frame) return;
    if (kind === "segment" && targetId) this.context.queuedSegments.add(targetId);
    const events = this.context.bundle.scenes?.[this.context.frame.passageId]?.events ?? [];
    for (const event of events) {
      if (event.phase === "exit" || (this.context.skipped && event.action.kind === "effect"))
        continue;
      if (!matchesTrigger(event.trigger, kind, targetId) || this.issued.has(event.id)) continue;
      if (event.action.kind === "effect" && !this.effectReady(event.blockId ?? "scene")) continue;
      this.issue(event);
    }
  }
  private effectReady(id: string) {
    const target = this.targets.get(id);
    return Boolean(
      target && this.mediaVisible(id) && (!target.video || target.video.readyState >= 2),
    );
  }
  private issue(event: NarrativeEvent) {
    this.issued.add(event.id);
    if (event.blockId)
      this.pendingBlocks.set(event.blockId, (this.pendingBlocks.get(event.blockId) ?? 0) + 1);
    if (event.blocking) {
      this.blocking++;
      this.context.publish({ blocking: true });
    }
    this.clock.schedule(() => this.dispatch(event), event.delayMs ?? 0);
  }
  private done(event: NarrativeEvent, generation: number) {
    if (generation !== this.context.generation) return;
    if (event.blockId) {
      const pending = Math.max(0, (this.pendingBlocks.get(event.blockId) ?? 1) - 1);
      this.pendingBlocks.set(event.blockId, pending);
      if (!pending)
        this.context.publish({
          completedBlocks: [...this.context.state.completedBlocks, event.blockId],
        });
    }
    if (event.action.kind === "effect" && event.action.effect.id === "crossfade")
      this.context.publish({ previousImage: undefined });
    if (event.blocking) {
      this.blocking = Math.max(0, this.blocking - 1);
      this.context.publish({ blocking: this.blocking > 0 });
    }
  }
  private dispatch(event: NarrativeEvent) {
    const generation = this.context.generation;
    const action = event.action;
    if (this.context.scope.signal.aborted) return;
    if (action.kind === "stop-audio") {
      this.sceneAudio.stop(action.channel);
      this.done(event, generation);
      return;
    }
    if (action.kind === "audio") {
      this.sceneAudio.play(event, this.context.scope.signal, this.context.preferences.sound);
      this.done(event, generation);
      return;
    }
    const reduced = this.reducedMotion();
    if (action.effect.id.startsWith("react-bits.")) {
      if (!reduced)
        this.context.publish({
          layers: [
            ...this.context.state.layers,
            { id: event.id, blockId: event.blockId, effect: action.effect as ReactBitsEffect },
          ],
        });
      this.clock.schedule(
        () => {
          this.context.publish({
            layers: this.context.state.layers.filter((layer) => layer.id !== event.id),
          });
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
      this.context.scope.signal,
      reduced,
    );
    void playback.finished.then(() => this.done(event, generation));
  }
  skipCinematic = () => {
    this.context.skipped = true;
    this.clock.clear();
    this.effects.stop();
    this.audio.stopChannel("sfx");
    this.blocking = 0;
    this.context.publish({
      blocking: false,
      layers: [],
      previousImage: undefined,
      completedBlocks:
        this.context.bundle.scenes?.[this.context.frame?.passageId ?? ""]?.blocks
          ?.filter((block) => block.kind === "media")
          .map((block) => block.id) ?? [],
    });
  };
  revealRemaining = () => {
    this.skipCinematic();
    this.context.publish({ revealAll: true });
    this.context.publish({
      visibleMedia:
        this.context.bundle.scenes?.[this.context.frame?.passageId ?? ""]?.blocks
          ?.filter((b) => b.kind === "media")
          .map((b) => b.id) ?? [],
    });
  };
  cancel() {
    this.videos.forEach((video) => video.pause());
    this.videos.clear();
    this.context.generation++;
    this.context.scope.abort();
    this.clock.clear();
    this.effects.stop();
    this.sceneAudio.cancelPage();
    this.targets.clear();
    this.context.publish({ blocking: false, layers: [], voice: "off" });
  }
}

function setVideoSound(target: EffectTargets, preferences: ReadingPreferences) {
  if (!target.video) return;
  target.video.muted = Boolean(target.silentVideo) || !preferences.sound;
  target.video.volume = preferences.volumes?.sfx ?? 0.65;
}
