import { defaultVolumes } from "../../contracts/presentation.ts";
import type { ReadingPreferences } from "../../contracts/presentation.ts";
import { mediaIsVisible } from "../../contracts/presentation.ts";
import type { ReactBitsEffect } from "../../contracts/effects.ts";
import type { NarrativeEvent } from "../../contracts/narrative-events.ts";
import type { NativeEffect } from "../../contracts/native-effects.ts";
import { dissolveWords } from "./page-departure.ts";
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
  /** Image show/expiry timers: page layout, so skipping a cinematic must not drop them. */
  private readonly layout = new PresentationClock();
  private readonly targets = new Map<string, EffectTargets>();
  private readonly pendingBlocks = new Map<string, number>();
  private readonly issued = new Set<string>();
  private readonly videos = new Set<HTMLVideoElement>();
  /** In-flow media blocks that have scrolled into view on this page. */
  private readonly entered = new Set<string>();
  private blocking = 0;
  constructor(context: PlaybackContext, audio: AudioManager) {
    this.context = context;
    this.audio = audio;
    this.sceneAudio = new SceneAudio(context.bundle, audio);
  }
  beginFrame() {
    this.issued.clear();
    this.pendingBlocks.clear();
    this.entered.clear();
    this.blocking = 0;
  }
  configure(preferences: ReadingPreferences, wasEnabled: boolean | undefined) {
    const volumes = preferences.volumes ?? defaultVolumes;
    for (const channel of ["sfx", "ambience", "music", "narration"] as const)
      this.audio.setVolume(channel, volumes[channel] * (preferences.masterVolume ?? 1));
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
    this.layout.pause();
    this.audio.pause();
    this.audio.setDucking(false);
    const voice = this.context.state.voice;
    this.context.publish({ paused: true, voice: voice === "playing" ? "paused" : voice });
  }
  resume() {
    for (const [id, target] of this.targets)
      if (
        target.video &&
        this.mediaVisible(id) &&
        !this.awaitsEntry(id) &&
        (!target.silentVideo || !this.reducedMotion())
      )
        void target.video.play().catch(() => {});
    this.effects.resume();
    this.clock.resume();
    this.layout.resume();
    this.audio.resume();
    const voice = this.context.state.voice === "paused" ? "playing" : this.context.state.voice;
    this.audio.setDucking(voice === "playing");
    this.context.publish({ paused: false, voice });
  }
  resetAudio() {
    this.sceneAudio.reset();
    this.audio.resume();
    this.clock.resume();
    this.layout.resume();
  }
  dispose() {
    this.sceneAudio.dispose();
  }
  bind(targets: EffectTargets, blockId = "scene") {
    const loaded = () => this.queueTarget(blockId);
    this.targets.set(blockId, targets);
    // An image that fails to load settles too (see imagesReady).
    targets.canvas.addEventListener?.("load", loaded, true);
    targets.canvas.addEventListener?.("error", loaded, true);
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
    const observer = this.observeEntry(targets.canvas, blockId);
    return () => {
      observer?.disconnect();
      targets.canvas.removeEventListener?.("load", loaded, true);
      targets.canvas.removeEventListener?.("error", loaded, true);
      if (targets.video) {
        targets.video.removeEventListener("loadeddata", loaded);
        targets.video.pause();
        this.videos.delete(targets.video);
      }
      if (this.targets.get(blockId) === targets) this.targets.delete(blockId);
    };
  }
  private get blocks() {
    return this.context.bundle.scenes?.[this.context.frame?.passageId ?? ""]?.blocks ?? [];
  }
  private mediaBlock(id: string | undefined) {
    return this.blocks.find((block) => block.kind === "media" && block.id === id);
  }
  private mediaIds() {
    return this.blocks.filter((block) => block.kind === "media").map((block) => block.id);
  }
  /** Instant text: an in-flow image starts its entrance, cues and duration once it scrolls into view. */
  private awaitsEntry(id: string) {
    const block = this.mediaBlock(id);
    return (
      block?.kind === "media" &&
      block.layout !== "fullscreen" &&
      block.layout !== "background" &&
      this.context.state.revealAll &&
      !this.context.restored &&
      typeof IntersectionObserver !== "undefined" &&
      !this.entered.has(id)
    );
  }
  private observeEntry(element: HTMLElement, id: string) {
    if (typeof IntersectionObserver === "undefined" || this.mediaBlock(id)?.kind !== "media")
      return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      const waited = this.awaitsEntry(id);
      this.entered.add(id);
      if (waited) this.queueTarget(id);
    });
    observer.observe(element);
    return observer;
  }
  private mediaVisible(id: string) {
    const block = this.mediaBlock(id);
    return block?.kind === "media"
      ? mediaIsVisible(block, this.context.state)
      : !this.context.state.expiredMedia.includes(id);
  }
  private queueTarget(id: string) {
    if (!this.mediaVisible(id) || this.awaitsEntry(id)) return;
    const target = this.targets.get(id);
    if (target && !this.imagesReady(target)) return;
    if (!this.context.restored) this.startPersistence(id);
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
    const board = element.querySelector?.<HTMLElement>(".reader-board") ?? element;
    this.targets.set("page", { canvas: board });
    this.targets.set("scene", { canvas: board });
    if (!this.context.restored) this.queue("passage");
    return () => {
      if (this.targets.get("page")?.canvas === board) this.targets.delete("page");
      if (this.targets.get("scene")?.canvas === board) this.targets.delete("scene");
    };
  }
  async leave(direction: "forward" | "back" = "forward") {
    const targets = this.targets.get("page");
    if (!targets || this.context.state.departed) return;
    this.context.publish({ exiting: true });
    await dissolveWords(
      targets.canvas,
      this.context.scope.signal,
      this.reducedMotion() || !this.context.preferences.pageTurn,
      direction,
    );
    this.context.publish({ departed: true });
  }
  reducedMotion() {
    return (
      typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }
  showSegmentMedia(id: string) {
    for (const block of this.blocks)
      if (block.kind === "media" && block.show?.kind === "segment" && block.show.segmentId === id)
        this.showMedia(block.id, block.show.delayMs ?? 0);
  }
  showMedia(id: string, delay: number) {
    if (this.issued.has(`show:${id}`)) return;
    this.issued.add(`show:${id}`);
    this.layout.schedule(() => {
      this.context.publish({ visibleMedia: [...this.context.state.visibleMedia, id] });
      this.queueTarget(id);
    }, delay);
  }
  private startPersistence(id: string) {
    if (!this.targets.has(id) || this.issued.has(`expire:${id}`)) return;
    const block = this.mediaBlock(id);
    if (block?.kind !== "media" || !block.durationMs || block.layout === "fullscreen") return;
    this.issued.add(`expire:${id}`);
    this.layout.schedule(() => {
      this.targets.get(id)?.video?.pause();
      this.context.publish({ expiredMedia: [...this.context.state.expiredMedia, id] });
    }, block.durationMs);
  }
  queue(kind: "passage" | "segment" | "block", targetId?: string) {
    if (!this.context.frame) return;
    if (kind === "segment" && targetId) this.context.queuedSegments.add(targetId);
    const events = this.context.bundle.scenes?.[this.context.frame.passageId]?.events ?? [];
    const pending = events.filter(
      (event) =>
        event.phase !== "exit" &&
        !(this.context.skipped && event.action.kind === "effect") &&
        matchesTrigger(event.trigger, kind, targetId) &&
        !this.issued.has(event.id) &&
        (event.action.kind !== "effect" || this.effectReady(event.blockId ?? "scene")),
    );
    for (const event of pending) this.issue(event);
  }
  private effectReady(id: string) {
    const target = this.targets.get(id);
    return Boolean(
      target &&
      this.mediaVisible(id) &&
      !this.awaitsEntry(id) &&
      this.imagesReady(target) &&
      (!target.video || target.video.readyState >= 2),
    );
  }
  /**
   * Every image has settled: loaded, or failed (it has a source but no pixels). One missing file
   * must not keep the camera still for the whole page. An image whose source isn't set yet
   * (resolving) is still waited for.
   */
  private imagesReady(target: EffectTargets) {
    return Array.from(
      target.canvas.querySelectorAll?.<HTMLImageElement>(
        ".shot-image, .shot-plane-image, .parallax-layer",
      ) ?? [],
    ).every((image) => image.complete && (image.naturalWidth > 0 || image.currentSrc !== ""));
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
    // Older published stories may still contain cinematic-camera events for a lone image.
    // Do not animate depth that is not actually there; keep genuine layered/3D scenes.
    if (this.isLegacySingleImageCamera(event)) {
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
    void playback.then(() => this.done(event, generation));
  }
  private isLegacySingleImageCamera(event: NarrativeEvent) {
    if (
      event.action.kind !== "effect" ||
      event.action.effect.id !== "cinematic-camera" ||
      !event.blockId
    )
      return false;
    const block = this.mediaBlock(event.blockId);
    if (block?.kind !== "media") return false;
    if (block.illustration?.layers.length || block.motion?.layers.length) return false;
    const asset = this.context.bundle.assets?.find((asset) => asset.id === block.image);
    return !asset?.scene3d;
  }

  skipCinematic = () => {
    this.context.skipped = true;
    this.clock.clear();
    this.effects.stop();
    this.audio.stopChannel("sfx");
    this.blocking = 0;
    this.context.publish({
      blocking: false,
      skipMedia: true,
      layers: [],
      previousImage: undefined,
      completedBlocks: this.mediaIds(),
    });
  };
  revealRemaining = () => {
    this.context.publish({ revealAll: true });
    this.context.publish({
      visibleMedia: this.mediaIds(),
    });
  };
  cancel() {
    this.videos.forEach((video) => video.pause());
    this.videos.clear();
    this.context.generation++;
    this.context.scope.abort();
    this.clock.clear();
    this.layout.clear();
    this.effects.stop();
    this.sceneAudio.cancelPage();
    this.targets.clear();
    this.context.publish({ blocking: false, layers: [], voice: "off" });
  }
}

function setVideoSound(target: EffectTargets, preferences: ReadingPreferences) {
  if (!target.video) return;
  target.video.muted = Boolean(target.silentVideo) || !preferences.sound;
  target.video.volume =
    (preferences.volumes?.sfx ?? defaultVolumes.sfx) * (preferences.masterVolume ?? 1);
}
