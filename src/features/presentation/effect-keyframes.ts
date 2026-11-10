import type { EffectTargets } from "./effects.ts";
import type { NativeEffect } from "../../contracts/native-effects.ts";
import { cinematicFrames, cinematicPlaneFrames } from "./cinematic-presets.ts";
import { lightningElement } from "./lightning.ts";

export function cameraKeyframes(effect: NativeEffect, target: HTMLElement, depth = 1): Keyframe[] {
  switch (effect.id) {
    case "cinematic-camera":
      return target.dataset?.distance
        ? cinematicPlaneFrames(effect.cinematic, Number(target.dataset.distance))
        : cinematicFrames(effect.cinematic, depth);
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
      // A short, clearly felt jolt: authored intensity 0–1 maps to 0.5–1.5, and the motion
      // fits in the first 600 ms whatever the authored duration.
      const strength = 0.5 + (effect.intensity ?? 0.5);
      const span = Math.min(1, 600 / effect.duration);
      const frames = [
        [0, 0, 0],
        [-14, 5, -0.35],
        [12, -4, 0.28],
        [-9, 3, -0.2],
        [6, -2, 0.13],
        [-4, 1, -0.08],
        [2, -0.5, 0.04],
        [0, 0, 0],
      ].map(([x, y, roll], index, all) => ({
        offset: (index / (all.length - 1)) * span,
        transform: `translate(${x! * strength}px,${y! * strength}px) rotate(${roll! * strength}deg)`,
      }));
      return span < 1 ? [...frames, { offset: 1, transform: frames[0]!.transform }] : frames;
    }
    default:
      return [];
  }
}
export function effectKeyframes(effect: NativeEffect, target: HTMLElement): Keyframe[] {
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
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: `translateY(${effect.direction === "back" ? 22 : -22}px)` },
      ];
    case "fade-in":
      return [{ opacity: 0 }, { opacity: 1 }];
    case "fade-out":
      return [{ opacity: 1 }, { opacity: 0 }];
    case "crossfade":
      return [{ opacity: 0 }, { opacity: 1 }];
    case "light-flicker":
      // A strike, then fading return strokes; the light strength is in the bolt gradient.
      return [0, 1, 0.2, 0.9, 0.12, 0.6, 0].map((opacity, index) => ({
        opacity,
        offset: [0, 0.05, 0.11, 0.18, 0.27, 0.4, 1][index],
      }));
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

export function effectSurface(effect: NativeEffect, targets: EffectTargets) {
  let target =
    "target" in effect && effect.target === "canvas"
      ? targets.canvas
      : (targets.image ?? targets.canvas);
  let overlay: HTMLElement | undefined;
  if (["rain-overlay", "fog-overlay", "light-flicker"].includes(effect.id)) {
    overlay = targets.canvas.ownerDocument.createElement("div");
    overlay.className = `cinematic-overlay ${effect.id}`;
    overlay.style.setProperty("--spell-arc-duration", `${Math.min(2600, effect.duration)}ms`);
    overlay.setAttribute("aria-hidden", "true");
    if (effect.id === "light-flicker")
      overlay.append(
        lightningElement({ color: effect.color, strength: (effect.intensity ?? 0.4) * 0.55 }),
      );
    const reader = targets.canvas.closest?.(".reader");
    const board = targets.canvas.classList?.contains("reader-board");
    if (reader && board) overlay.classList.add("reader-viewport-effect");
    (reader && board ? reader : targets.canvas).append(overlay);
    target = overlay;
  }
  return { target, overlay };
}
export function imagePlaneTargets(effect: NativeEffect, targets: EffectTargets): EffectTargets {
  if (effect.id !== "cinematic-camera" || !targets.image?.classList?.contains("multiplane-camera"))
    return targets;
  const planes = [...targets.image.querySelectorAll<HTMLElement>(".multiplane-plane")];
  return { ...targets, image: planes[0], layers: planes.slice(1) };
}
export function effectEasing(effect: NativeEffect) {
  if (effect.id === "cinematic-camera") return "cubic-bezier(.25,.1,.25,1)";
  if (effect.id === "page-turn") return "cubic-bezier(.24,.08,.23,1)";
  return "ease-in-out";
}
