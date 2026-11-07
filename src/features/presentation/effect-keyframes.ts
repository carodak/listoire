import type { NativeEffect } from "../../contracts/effects.ts";
import { cinematicFrames, cinematicPlaneFrames } from "./cinematic-presets.ts";

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
      const strength = effect.intensity ?? 0.5;
      return [
        [0, 0, 0],
        [-14, 5, -0.35],
        [12, -4, 0.28],
        [-9, 3, -0.2],
        [6, -2, 0.13],
        [-4, 1, -0.08],
        [2, -0.5, 0.04],
        [0, 0, 0],
      ].map(([x, y, roll]) => ({
        transform: `translate(${x! * strength}px,${y! * strength}px) rotate(${roll! * strength}deg)`,
      }));
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
