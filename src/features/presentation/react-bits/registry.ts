import type { ComponentType } from "react";
import type { ReactBitsId } from "../../../contracts/effects.ts";
type Module = { default: ComponentType<Record<string, unknown>> };
const load = (loader: () => Promise<{ default: unknown }>) => (): Promise<Module> =>
  loader().then((module) => ({ default: module.default as Module["default"] }));
export const reactBitsLoaders: Record<ReactBitsId, () => Promise<Module>> = {
  "react-bits.light-rays": load(() => import("./vendor/LightRays.jsx")),
  "react-bits.lightning": load(() => import("./vendor/Lightning.jsx")),
  "react-bits.particles": load(() => import("./vendor/Particles.jsx")),
  "react-bits.dark-veil": load(() => import("./vendor/DarkVeil.jsx")),
  "react-bits.magic-rings": load(() => import("./vendor/MagicRings.jsx")),
  "react-bits.noise": load(() => import("./vendor/Noise.jsx")),
  "react-bits.ripple-distortion": load(() => import("./vendor/RippleDistortion.jsx")),
  "react-bits.aurora": load(() => import("./vendor/Aurora.jsx")),
  "react-bits.side-rays": load(() => import("./vendor/SideRays.jsx")),
  "react-bits.light-pillar": load(() => import("./vendor/LightPillar.jsx")),
  "react-bits.splash-cursor": load(() => import("./vendor/SplashCursor.jsx")),
  "react-bits.grid-distortion": load(() => import("./vendor/GridDistortion.jsx")),
  "react-bits.prismatic-burst": load(() => import("./vendor/PrismaticBurst.jsx")),
  "react-bits.ghost-fibers": load(() => import("./vendor/GhostFibers.jsx")),
};
