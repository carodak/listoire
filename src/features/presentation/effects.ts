import { PresentationClock } from "./presentation-clock.ts";
import type { NativeEffect } from "../../contracts/effects.ts";
import { cameraKeyframes, effectKeyframes } from "./effect-keyframes.ts";
export interface EffectTargets {
  canvas: HTMLElement;
  image?: HTMLElement;
  previousImage?: HTMLElement;
  layers?: HTMLElement[];
  video?: HTMLVideoElement;
  silentVideo?: boolean;
}
export interface EffectPlayback {
  finished: Promise<"ended" | "aborted" | "unavailable" | "timeout">;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

function effectSurface(effect: NativeEffect, targets: EffectTargets) {
  let target =
    "target" in effect && effect.target === "canvas"
      ? targets.canvas
      : (targets.image ?? targets.canvas);
  let overlay: HTMLElement | undefined;
  if (["rain-overlay", "fog-overlay", "light-flicker"].includes(effect.id)) {
    overlay = targets.canvas.ownerDocument.createElement("div");
    overlay.className = `cinematic-overlay ${effect.id}`;
    overlay.setAttribute("aria-hidden", "true");
    if (effect.id === "light-flicker") overlay.style.backgroundColor = effect.color ?? "#ffffff";
    targets.canvas.append(overlay);
    target = overlay;
  }
  return { target, overlay };
}
function holdFinalState(effect: NativeEffect, target: HTMLElement, previous?: HTMLElement) {
  switch (effect.id) {
    case "cinematic-camera":
      target.style.transform = String(cameraKeyframes(effect, target).at(-1)!.transform);
      break;
    case "crossfade":
      if (previous) previous.style.opacity = "0";
      target.style.opacity = "1";
      break;
    case "fade-in":
      target.style.opacity = "1";
      break;
    case "fade-out":
      target.style.opacity = "0";
      break;
    case "slow-zoom":
    case "camera-zoom":
      target.style.scale = String(effect.scale);
      break;
    case "camera-pan":
    case "parallax":
      target.style.translate = `${effect.x}% ${effect.y}%`;
      break;
  }
}

function holdLayerStyles(effect: NativeEffect, targets: EffectTargets) {
  if (effect.id === "cinematic-camera")
    for (const [index, layer] of (targets.layers ?? []).entries())
      layer.style.transform = String(
        cameraKeyframes(effect, layer, 1 + (index + 1) * 0.3).at(-1)!.transform,
      );
}
function imagePlaneTargets(effect: NativeEffect, targets: EffectTargets): EffectTargets {
  if (effect.id !== "cinematic-camera" || !targets.image?.classList?.contains("multiplane-camera"))
    return targets;
  const planes = [...targets.image.querySelectorAll<HTMLElement>(".multiplane-plane")];
  return { ...targets, image: planes[0], layers: planes.slice(1) };
}
export class EffectsEngine {
  private readonly running = new Set<EffectPlayback>();
  private readonly heldStyles = new Map<
    HTMLElement,
    { scale: string; translate: string; opacity: string; transform: string }
  >();
  private rememberStyle(target: HTMLElement) {
    if (!this.heldStyles.has(target))
      this.heldStyles.set(target, {
        scale: target.style.scale,
        translate: target.style.translate,
        opacity: target.style.opacity,
        transform: target.style.transform,
      });
  }
  play(
    effect: NativeEffect,
    targets: EffectTargets,
    signal: AbortSignal,
    reducedMotion: boolean,
  ): EffectPlayback {
    if (signal.aborted || reducedMotion)
      return {
        finished: Promise.resolve(signal.aborted ? "aborted" : "ended"),
        stop() {},
        pause() {},
        resume() {},
      };
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
    if (persistent) this.rememberStyle(target);
    if (effect.id === "crossfade" && targets.previousImage)
      this.rememberStyle(targets.previousImage);
    let resolve!: (value: "ended" | "aborted" | "unavailable" | "timeout") => void;
    const finished = new Promise<"ended" | "aborted" | "unavailable" | "timeout">((done) => {
      resolve = done;
    });
    let settled = false;
    const clock = new PresentationClock();
    const delay = "delay" in effect ? (effect.delay ?? 0) : 0;
    const animations: Animation[] = [];
    const finish = (result: "ended" | "aborted" | "unavailable" | "timeout") => {
      if (settled) return;
      settled = true;
      clock.clear();
      signal.removeEventListener("abort", stop);
      if (result === "ended") holdFinalState(effect, target, targets.previousImage);
      if (result === "ended") holdLayerStyles(effect, targets);
      animations.forEach((animation) => animation.cancel());
      overlay?.remove();
      this.running.delete(playback);
      resolve(result);
    };
    const stop = () => finish("aborted");
    const playback: EffectPlayback = {
      finished,
      stop,
      pause: () => {
        if (settled) return;
        clock.pause();
        animations.forEach((animation) => animation.pause());
      },
      resume: () => {
        if (settled) return;
        clock.resume();
        animations.forEach((animation) => animation.play());
      },
    };
    clock.schedule(() => finish("timeout"), effect.duration + delay + 1000);
    this.running.add(playback);
    signal.addEventListener("abort", stop, { once: true });
    try {
      if (!target.animate) {
        finish("unavailable");
        return playback;
      }
      animations.push(
        target.animate(effectKeyframes(effect, target), {
          duration: effect.duration,
          delay,
          easing: effect.id === "cinematic-camera" ? "cubic-bezier(.25,.1,.25,1)" : "ease-in-out",
          fill: "forwards",
        }),
      );
      this.animateLayers(effect, targets, animations, delay);
      if (effect.id === "crossfade" && targets.previousImage?.animate)
        animations.push(
          targets.previousImage.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: effect.duration,
            fill: "none",
          }),
        );
      void Promise.all(animations.map((animation) => animation.finished)).then(
        () => finish("ended"),
        () => finish("aborted"),
      );
    } catch {
      finish("unavailable");
    }
    return playback;
  }
  private animateLayers(
    effect: NativeEffect,
    targets: EffectTargets,
    animations: Animation[],
    delay: number,
  ) {
    if (effect.id === "cinematic-camera")
      for (const [index, layer] of (targets.layers ?? []).entries()) {
        this.rememberStyle(layer);
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
    this.running.forEach((playback) => playback.pause());
  }
  resume() {
    this.running.forEach((playback) => playback.resume());
  }
  stop() {
    for (const playback of [...this.running]) playback.stop();
    for (const [target, style] of this.heldStyles) {
      target.style.scale = style.scale;
      target.style.translate = style.translate;
      target.style.opacity = style.opacity;
      target.style.transform = style.transform;
    }
    this.heldStyles.clear();
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
