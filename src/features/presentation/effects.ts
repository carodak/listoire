import { PresentationClock } from "./presentation-clock.ts";
import type { NativeEffect } from "../../contracts/native-effects.ts";
import {
  cameraKeyframes,
  effectKeyframes,
  effectSurface,
  imagePlaneTargets,
  effectEasing,
} from "./effect-keyframes.ts";
export interface EffectTargets {
  canvas: HTMLElement;
  image?: HTMLElement;
  previousImage?: HTMLElement;
  layers?: HTMLElement[];
  video?: HTMLVideoElement;
  silentVideo?: boolean;
}
type EffectResult = "ended" | "aborted" | "unavailable" | "timeout";

export class EffectsEngine {
  private readonly running = new Set<{
    animations: Animation[];
    clock: PresentationClock;
    stop: () => void;
  }>();
  private readonly held = new Set<Animation>();
  play(
    effect: NativeEffect,
    targets: EffectTargets,
    signal: AbortSignal,
    reducedMotion: boolean,
  ): Promise<EffectResult> {
    if (signal.aborted || reducedMotion)
      return Promise.resolve(signal.aborted ? "aborted" : "ended");
    targets = imagePlaneTargets(effect, targets);
    const { target, overlay } = effectSurface(effect, targets);
    const persistent = [
      "slow-zoom",
      "camera-zoom",
      "camera-pan",
      "parallax",
      "fade-in",
      "fade-out",
      "crossfade",
      "cinematic-camera",
    ].includes(effect.id);
    let resolve!: (value: EffectResult) => void;
    const finished = new Promise<EffectResult>((done) => {
      resolve = done;
    });
    const clock = new PresentationClock();
    const delay = "delay" in effect ? (effect.delay ?? 0) : 0;
    const animations: Animation[] = [];
    const finish = (result: EffectResult) => {
      if (!this.running.delete(playback)) return;
      clock.clear();
      signal.removeEventListener("abort", stop);
      if (result === "ended" && persistent)
        animations.forEach((animation) => this.held.add(animation));
      else animations.forEach((animation) => animation.cancel());
      overlay?.remove();
      resolve(result);
    };
    const stop = () => finish("aborted");
    const playback = { animations, clock, stop };
    clock.schedule(() => finish("timeout"), effect.duration + delay + 1000);
    this.running.add(playback);
    signal.addEventListener("abort", stop, { once: true });
    try {
      if (!target.animate) {
        finish("unavailable");
        return finished;
      }
      animations.push(
        target.animate(effectKeyframes(effect, target), {
          duration: effect.duration,
          delay,
          easing: effectEasing(effect),
          fill: "forwards",
        }),
      );
      this.animateLayers(effect, targets, animations, delay);
      if (effect.id === "crossfade" && targets.previousImage?.animate)
        animations.push(
          targets.previousImage.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: effect.duration,
            fill: "forwards",
          }),
        );
      void Promise.all(animations.map((animation) => animation.finished)).then(
        () => finish("ended"),
        () => finish("aborted"),
      );
    } catch {
      finish("unavailable");
    }
    return finished;
  }
  private animateLayers(
    effect: NativeEffect,
    targets: EffectTargets,
    animations: Animation[],
    delay: number,
  ) {
    if (effect.id === "cinematic-camera")
      for (const [index, layer] of (targets.layers ?? []).entries()) {
        const frames = cameraKeyframes(effect, layer, 1 + (index + 1) * 0.3);
        animations.push(
          layer.animate(frames, {
            duration: effect.duration,
            delay,
            easing: "cubic-bezier(.25,.1,.25,1)",
            fill: "forwards",
          }),
        );
      }
  }

  pause() {
    for (const { clock, animations } of this.running) {
      clock.pause();
      animations.forEach((animation) => animation.pause());
    }
  }
  resume() {
    for (const { clock, animations } of this.running) {
      clock.resume();
      animations.forEach((animation) => animation.play());
    }
  }
  stop() {
    for (const playback of [...this.running]) playback.stop();
    this.held.forEach((animation) => animation.cancel());
    this.held.clear();
  }
}

export function runEffect(
  target: HTMLElement,
  effect: NativeEffect,
  signal: AbortSignal,
  reducedMotion: boolean,
) {
  return new EffectsEngine().play(effect, { canvas: target, image: target }, signal, reducedMotion);
}
