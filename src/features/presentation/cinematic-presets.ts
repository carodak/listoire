import type { Cinematic } from "../../contracts/cinematic.ts";
export function cinematicDuration(speed: Cinematic["speed"], motion?: Cinematic) {
  if (motion?.preset === "high-arrival-hold-pullback")
    return motion.durationMs ?? { slow: 14000, normal: 11000, fast: 8500 }[speed];
  return motion?.durationMs ?? { slow: 8500, normal: 6000, fast: 4000 }[speed];
}
interface CameraFrame {
  scale: number;
  x: number;
  y: number;
  tilt: number;
  rotation: number;
  offset?: number;
}
type Pose = [scale: number, x?: number, y?: number, rotation?: number, offset?: number];
const poses: Record<Cinematic["preset"], Pose[]> = {
  none: [[1], [1]],
  "gentle-depth": [
    [1.12, -7],
    [1.2, 7],
  ],
  "cinematic-push-in": [[1.04], [1.32]],
  "downward-reveal": [
    [1.3, 0, -9],
    [1.3, 0, 9],
  ],
  "sideways-drift": [
    [1.2, -9],
    [1.24, 9],
  ],
  "character-focus": [[1.05], [1.25, 5]],
  "atmospheric-still": [[1], [1, 0.15]],
  "dramatic-descent": [
    [1.5, 0, -14, -0.08],
    [1.25, 0.08, -2, 0.04],
    [1.3, -0.06, 0, -0.03],
    [1.35, 0.04, 3, 0.02],
    [1.4, 0, 9],
  ],
  "handheld-discovery": [
    [1.2, -6, -0.15, -0.055],
    [1.23, -2, 0.12, 0.045],
    [1.26, 1, -0.1, -0.025],
    [1.3, 3, 0.08, 0.02],
    [1.34, 4, 0],
  ],
  "dolly-pullback": [
    [1.7, 0, 2],
    [0.72, 0, -1],
  ],
  "low-diagonal-pullback": [
    [1.8, -26, 24, -0.15, 0],
    [1.5, 0, 0, 0, 0.45],
    [0.65, 0, 0, 0, 1],
  ],
  "deep-pullback": [
    [2, 0, 0, 0, 0],
    [0.55, 0, 0, 0, 1],
  ],
  "high-arrival-hold-pullback": [
    [1.9, 0, -28, -0.08, 0],
    [1.4, 0, 0, 0, 0.3],
    [1.4, 0, 0, 0, 0.6],
    [0.55, 0, 0, 0, 1],
  ],
  "sweeping-arrival": [
    [1.4, -12, -4, -0.1],
    [1.22, 1, 0, 0.04],
    [1.32, 4, 2],
  ],
  "rising-focus": [
    [1.3, 0, 10],
    [1.4, 0, -6],
  ],
  "impact-push": [
    [1.12],
    [1.14, -0.04, 0.03],
    [1.42, 0.06, -0.05, -0.04],
    [1.35, -0.03, 0.02, 0.03],
    [1.38],
  ],
  // Stored projects retain their legacy movements; new authoring uses the curated presets.
  "slow-reveal": [[1.14], [1.04]],
  "dramatic-push": [[1.02], [1.14]],
  "upward-reveal": [
    [1.2, 0, 6],
    [1.08, 0, -6],
  ],
  "cinematic-drift": [
    [1.14, -6, -2],
    [1.14, 6, 2],
  ],
  "perspective-reveal": [[1.18], [1.12, -3, 0, 0.25]],
  suspense: [[1.04], [1.07, 0.08, -0.06, 0.035], [1.1, -0.07, 0.08, -0.025], [1.13]],
  parallax: [
    [1.14, -6, -2],
    [1.14, 6, 2],
  ],
  "auto-parallax": [
    [1.14, -6, -2],
    [1.14, 6, 2],
  ],
};
function cinematicMotionFrames(options: Cinematic, depth = 1): CameraFrame[] {
  const strength = { subtle: 0.65, normal: 0.85, strong: 1 }[options.intensity];
  const direction = options.direction === "left" || options.direction === "up" ? -1 : 1;
  const vertical = options.direction === "up" || options.direction === "down";
  return poses[options.preset].map(
    ([scale, x = 0, y = 0, rotation = 0, offset], index, frames) => ({
      scale: 1 + (scale - 1) * (0.7 + 0.3 * strength),
      x: (vertical ? y : x) * direction * strength * depth,
      y: (vertical ? x : y) * strength * depth,
      rotation: rotation * strength,
      tilt: options.preset === "perspective-reveal" ? index * 2 * strength : 0,
      offset: offset ?? index / (frames.length - 1),
    }),
  );
}

export function cinematicFrames(options: Cinematic, depth = 1): Keyframe[] {
  if (options.preset === "none") return [{ transform: "none" }, { transform: "none" }];
  return cinematicMotionFrames(options, depth).map(({ scale, x, y, tilt, rotation, offset }) => ({
    transform: `perspective(1200px) translate3d(${x}%,${y}%,0) scale(${scale}) rotateY(${tilt}deg) rotateZ(${rotation}deg)`,
    ...(offset === undefined ? {} : { offset }),
  }));
}
export function cinematicPlaneFrames(options: Cinematic, distance: number): Keyframe[] {
  // Explicit projection preserves depth in Safari's software renderer, which flattens nested CSS 3D.
  return cinematicMotionFrames(options).map(({ scale, x, y, rotation, offset }) => {
    const cameraZ = 800 * (1 - 1 / scale);
    const projection = 800 / (distance - cameraZ);
    const framing = distance / (distance - cameraZ);
    const focus = options.preset === "character-focus" ? 800 / (1600 - cameraZ) : 0;
    return {
      transform: `translate(${x * (projection - focus)}%,${y * projection}%) scale(${framing}) rotate(${rotation}deg)`,
      ...(offset === undefined ? {} : { offset }),
    };
  });
}
