import type { NativeEffect } from "../../contracts/effects.ts";
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

function keyframes(effect: NativeEffect, target: HTMLElement): Keyframe[] {
  switch (effect.id) {
    case "fade-in":
      return [{ opacity: 0 }, { opacity: 1 }];
    case "fade-out":
      return [{ opacity: 1 }, { opacity: 0 }];
    case "crossfade":
      return [{ opacity: 0 }, { opacity: 1 }];
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
function holdFinalState(effect: NativeEffect, target: HTMLElement, previous?: HTMLElement) {
  switch (effect.id) {
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

export class EffectsEngine {
  private readonly running = new Set<EffectPlayback>();
  private readonly heldStyles = new Map<
    HTMLElement,
    { scale: string; translate: string; opacity: string }
  >();
  private rememberStyle(target: HTMLElement) {
    if (!this.heldStyles.has(target))
      this.heldStyles.set(target, {
        scale: target.style.scale,
        translate: target.style.translate,
        opacity: target.style.opacity,
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
    let remaining = effect.duration + (effect.delay ?? 0) + 1000;
    let started = performance.now();
    const animations: Animation[] = [];
    const finish = (result: "ended" | "aborted" | "unavailable" | "timeout") => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      signal.removeEventListener("abort", stop);
      if (result === "ended") holdFinalState(effect, target, targets.previousImage);
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
      if (!target.animate) {
        finish("unavailable");
        return playback;
      }
      animations.push(
        target.animate(keyframes(effect, target), {
          duration: effect.duration,
          delay: effect.delay ?? 0,
          easing: "ease-in-out",
          fill: "forwards",
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
    for (const [target, style] of this.heldStyles) {
      target.style.scale = style.scale;
      target.style.translate = style.translate;
      target.style.opacity = style.opacity;
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
