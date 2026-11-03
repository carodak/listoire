import type { NativeEffect } from "../../contracts/effects.ts";
import { cinematicFrames } from "./cinematic-presets.ts";
export interface EffectTargets {
  canvas: HTMLElement;
  image?: HTMLElement;
  previousImage?: HTMLElement;
  layers?: HTMLElement[];
  video?: HTMLVideoElement;
}
export interface EffectPlayback {
  finished: Promise<"ended" | "aborted" | "unavailable" | "timeout">;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

function cameraKeyframes(effect: NativeEffect, target: HTMLElement): Keyframe[] {
  switch (effect.id) {
    case "cinematic-camera":
      return cinematicFrames(effect.cinematic);
    case "camera-zoom":
    case "slow-zoom":
      return [{ scale: getComputedStyle(target).scale }, { scale: effect.scale }];
    case "camera-pan":
    case "parallax":
      return [
        { translate: getComputedStyle(target).translate },
        { translate: `${effect.x}% ${effect.y}%` },
      ];
    case "screen-shake": {
      const offset = (effect.intensity ?? 0.5) * 6;
      return [
        { transform: "translateX(0)" },
        { transform: `translateX(${-offset}px)` },
        { transform: `translateX(${offset}px)` },
        { transform: `translateX(${-offset / 2}px)` },
        { transform: "translateX(0)" },
      ];
    }
    default:
      return [];
  }
}
function keyframes(effect: NativeEffect, target: HTMLElement): Keyframe[] {
  if (
    [
      "cinematic-camera",
      "camera-zoom",
      "slow-zoom",
      "camera-pan",
      "parallax",
      "screen-shake",
    ].includes(effect.id)
  )
    return cameraKeyframes(effect, target);
  switch (effect.id) {
    case "video-playback":
      return [{ opacity: 1 }, { opacity: 1 }];

    case "page-turn":
      return [
        {
          transform: "perspective(1600px) rotateY(0deg)",
          filter: "brightness(1)",
          transformOrigin: effect.direction === "back" ? "right center" : "left center",
        },
        {
          transform: `perspective(1600px) rotateY(${effect.direction === "back" ? 48 : -48}deg)`,
          filter: "brightness(.8)",
          boxShadow: "inset -35px 0 70px #0003",
          borderRadius:
            effect.direction === "back" ? "24% 0 0 24% / 50% 0 0 50%" : "0 24% 24% 0 / 0 50% 50% 0",
          opacity: 0,
          transformOrigin: effect.direction === "back" ? "right center" : "left center",
        },
      ];
    case "fade-in":
      return [{ opacity: 0 }, { opacity: 1 }];
    case "fade-out":
      return [{ opacity: 1 }, { opacity: 0 }];
    case "crossfade":
      return [{ opacity: 0 }, { opacity: 1 }];
    case "light-flicker":
      return [{ opacity: 0 }, { opacity: (effect.intensity ?? 0.4) * 0.25 }, { opacity: 0 }];
    case "rain-overlay":
      return [
        { backgroundPosition: "0px 0px", opacity: 0 },
        { backgroundPosition: "-20px 180px", opacity: (effect.intensity ?? 0.3) * 0.4 },
        { backgroundPosition: "-40px 360px", opacity: 0 },
      ];
    case "fog-overlay":
      return [
        { transform: "translateX(-5%)", opacity: 0 },
        { transform: "translateX(0)", opacity: (effect.intensity ?? 0.3) * 0.5 },
        { transform: "translateX(5%)", opacity: 0 },
      ];
    case "cinematic-wipe": {
      const edges = {
        left: "0 100% 0 0",
        right: "0 0 0 100%",
        up: "100% 0 0 0",
        down: "0 0 100% 0",
      };
      return [{ clipPath: `inset(${edges[effect.direction]})` }, { clipPath: "inset(0 0 0 0)" }];
    }
  }
  return [];
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
      target.style.transform = String(cinematicFrames(effect.cinematic).at(-1)!.transform);
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
        cinematicFrames(effect.cinematic, 1 + (index + 1) * 0.3).at(-1)!.transform,
      );
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
    let paused = false;
    const delay = "delay" in effect ? (effect.delay ?? 0) : 0;
    let remaining = effect.duration + delay + 1000;
    let started = performance.now();
    const animations: Animation[] = [];
    const finish = (result: "ended" | "aborted" | "unavailable" | "timeout") => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
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
        if (settled || paused) return;
        paused = true;
        remaining -= performance.now() - started;
        clearTimeout(deadline);
        animations.forEach((animation) => animation.pause());
      },
      resume: () => {
        if (settled || !paused) return;
        paused = false;
        started = performance.now();
        deadline = setTimeout(() => finish("timeout"), Math.max(1, remaining));
        animations.forEach((animation) => animation.play());
      },
    };
    let deadline = setTimeout(() => finish("timeout"), effect.duration + delay + 1000);
    this.running.add(playback);
    signal.addEventListener("abort", stop, { once: true });
    try {
      if (!target.animate) {
        finish("unavailable");
        return playback;
      }
      animations.push(
        target.animate(keyframes(effect, target), {
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
        const frames = cinematicFrames(effect.cinematic, 1 + (index + 1) * 0.3);
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
