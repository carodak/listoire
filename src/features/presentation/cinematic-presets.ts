import type { Cinematic } from "../../contracts/cinematic.ts";
export function cinematicDuration(speed: Cinematic["speed"]) {
  return { slow: 24000, normal: 14000, fast: 8000 }[speed];
}
export function cinematicFrames(options: Cinematic, depth = 1): Keyframe[] {
  const strength = { subtle: 0.55, normal: 0.8, strong: 1 }[options.intensity];
  const distance = 3 * strength * depth;
  const direction = options.direction === "left" ? -1 : 1;
  const transform = (scale: number, x = 0, y = 0, tilt = 0, rotation = 0) =>
    `perspective(1200px) translate3d(${x}%,${y}%,0) scale(${1 + (scale - 1) * (0.7 + 0.3 * strength)}) rotateY(${tilt}deg) rotateZ(${rotation}deg)`;
  let start = transform(1.14),
    end = transform(1.04);
  switch (options.preset) {
    case "none":
      return [{ transform: "none" }, { transform: "none" }];
    case "dramatic-push":
      start = transform(1.02);
      end = transform(1.14);
      break;
    case "downward-reveal":
      start = transform(1.2, 0, -distance);
      end = transform(1.08, 0, distance);
      break;
    case "upward-reveal":
      start = transform(1.2, 0, distance);
      end = transform(1.08, 0, -distance);
      break;
    case "perspective-reveal":
      start = transform(1.18);
      end = transform(1.12, -distance / 2, 0, 2 * strength, 0.25 * strength);
      break;
    case "suspense":
      return [
        { transform: transform(1.04), offset: 0 },
        { transform: transform(1.07, 0.08, -0.06, 0, 0.035), offset: 0.32 },
        { transform: transform(1.1, -0.07, 0.08, 0, -0.025), offset: 0.7 },
        { transform: transform(1.13), offset: 1 },
      ];
    case "parallax":
    case "auto-parallax":
    case "cinematic-drift": {
      const vertical = ["up", "down"].includes(options.direction);
      const from = vertical
        ? transform(1.14, 0, options.direction === "up" ? distance : -distance)
        : transform(1.14, -distance * direction, -distance / 3);
      const to = vertical
        ? transform(1.14, 0, options.direction === "up" ? -distance : distance)
        : transform(1.14, distance * direction, distance / 3);
      start = from;
      end = to;
      break;
    }
  }
  return [{ transform: start }, { transform: end }];
}
