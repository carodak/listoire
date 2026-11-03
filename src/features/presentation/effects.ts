import type { NativeEffect } from "../../contracts/effects.ts";
import { cameraTransform } from "./camera.ts";
export interface EffectTargets {
  canvas: HTMLElement;
  image?: HTMLElement;
  previousImage?: HTMLElement;
}
export interface EffectPlayback {
  finished: Promise<"ended" | "aborted" | "unavailable" | "timeout">;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

function keyframes(effect: NativeEffect): Keyframe[] {
  switch (effect.id) {
    case "fade-in":
      return [{ opacity: 0 }, { opacity: 1 }];
    case "fade-out":
      return [{ opacity: 1 }, { opacity: 0 }];
    case "crossfade":
      return [{ opacity: 0 }, { opacity: 1 }];
    case "camera-zoom":
    case "slow-zoom":
      return [{ transform: cameraTransform(1) }, { transform: cameraTransform(effect.scale) }];
    case "camera-pan":
    case "parallax":
      return [
        { transform: cameraTransform(1) },
        { transform: cameraTransform(1, `${effect.x}%`, `${effect.y}%`) },
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
}

function effectSurface(effect: NativeEffect, targets: EffectTargets) {
  let target = effect.target === "canvas" ? targets.canvas : (targets.image ?? targets.canvas);
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

export class EffectsEngine {
  private readonly running = new Set<EffectPlayback>();
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
    let resolve!: (value: "ended" | "aborted" | "unavailable" | "timeout") => void;
    const finished = new Promise<"ended" | "aborted" | "unavailable" | "timeout">((done) => {
      resolve = done;
    });
    let settled = false;
    let paused = false;
    let remaining = effect.duration + (effect.delay ?? 0) + 1000;
    let started = performance.now();
    const animations: Animation[] = [];
    const finish = (result: "ended" | "aborted" | "unavailable" | "timeout") => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      signal.removeEventListener("abort", stop);
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
    let deadline = setTimeout(
      () => finish("timeout"),
      effect.duration + (effect.delay ?? 0) + 1000,
    );
    this.running.add(playback);
    signal.addEventListener("abort", stop, { once: true });
    try {
      if (!target.animate) finish("unavailable");
      else {
        animations.push(
          target.animate(keyframes(effect), {
            duration: effect.duration,
            delay: effect.delay ?? 0,
            easing: "ease-in-out",
            fill: "none",
          }),
        );
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
      }
    } catch {
      finish("unavailable");
    }
    return playback;
  }
  pause() {
    this.running.forEach((playback) => playback.pause());
  }
  resume() {
    this.running.forEach((playback) => playback.resume());
  }
  stop() {
    for (const playback of [...this.running]) playback.stop();
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
