import type { ComponentType } from "react";
import type { ReactBitsId } from "../../../contracts/effects.ts";
type Module = { default: ComponentType<Record<string, unknown>> };
export const reactBitsLoaders: Record<ReactBitsId, () => Promise<Module>> = {
  "react-bits.light-rays": () =>
    import("./vendor/LightRays.jsx").then((module) => ({
      default: module.default as ComponentType<Record<string, unknown>>,
    })),
  "react-bits.lightning": () =>
    import("./vendor/Lightning.jsx").then((module) => ({
      default: module.default as ComponentType<Record<string, unknown>>,
    })),
  "react-bits.particles": () =>
    import("./vendor/Particles.jsx").then((module) => ({
      default: module.default as ComponentType<Record<string, unknown>>,
    })),
  "react-bits.dark-veil": () =>
    import("./vendor/DarkVeil.jsx").then((module) => ({
      default: module.default as ComponentType<Record<string, unknown>>,
    })),
  "react-bits.magic-rings": () =>
    import("./vendor/MagicRings.jsx").then((module) => ({
      default: module.default as ComponentType<Record<string, unknown>>,
    })),
  "react-bits.noise": () =>
    import("./vendor/Noise.jsx").then((module) => ({
      default: module.default as ComponentType<Record<string, unknown>>,
    })),
  "react-bits.ripple-distortion": () =>
    import("./vendor/RippleDistortion.jsx").then((module) => ({
      default: module.default as ComponentType<Record<string, unknown>>,
    })),
  "react-bits.aurora": () =>
    import("./vendor/Aurora.jsx").then((module) => ({
      default: module.default as ComponentType<Record<string, unknown>>,
    })),
  "react-bits.side-rays": () =>
    import("./vendor/SideRays.jsx").then((module) => ({
      default: module.default as ComponentType<Record<string, unknown>>,
    })),
  "react-bits.light-pillar": () =>
    import("./vendor/LightPillar.jsx").then((module) => ({
      default: module.default as ComponentType<Record<string, unknown>>,
    })),
  "react-bits.splash-cursor": () =>
    import("./vendor/SplashCursor.jsx").then((module) => ({
      default: module.default as ComponentType<Record<string, unknown>>,
    })),
  "react-bits.grid-distortion": () =>
    import("./vendor/GridDistortion.jsx").then((module) => ({
      default: module.default as ComponentType<Record<string, unknown>>,
    })),
  "react-bits.prismatic-burst": () =>
    import("./vendor/PrismaticBurst.jsx").then((module) => ({
      default: module.default as ComponentType<Record<string, unknown>>,
    })),
  "react-bits.ghost-fibers": () =>
    import("./vendor/GhostFibers.jsx").then((module) => ({
      default: module.default as ComponentType<Record<string, unknown>>,
    })),
};
