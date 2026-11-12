import type { ReactBitsEffect } from "../../../contracts/effects.ts";

/** Ceilings on an effect's cost beside the text: a cheaper authored value is kept. */
const ceilings: Record<string, Record<string, number>> = {
  "react-bits.light-rays": { maxDevicePixelRatio: 1 },
  "react-bits.lightning": { dpr: 1 },
  "react-bits.particles": { pixelRatio: 1, particleCount: 60 },
  "react-bits.dark-veil": { dpr: 1 },
  "react-bits.magic-rings": { maxDevicePixelRatio: 1 },
  "react-bits.noise": { fps: 12 },
  "react-bits.aurora": { dpr: 1 },
  "react-bits.side-rays": { maxDevicePixelRatio: 1 },
  "react-bits.light-pillar": { resolution: 0.5 },
  "react-bits.prismatic-burst": { dpr: 1 },
  "react-bits.ghost-fibers": { threads: 30 },
};
/** Always these: no flicker (photosensitive readers), and the lowest quality setting. */
const fixed: Record<string, Record<string, unknown>> = {
  "react-bits.lightning": { flicker: 0 },
  "react-bits.noise": { flicker: 0 },
  "react-bits.ripple-distortion": { quality: "low" },
  "react-bits.light-pillar": { quality: "low" },
  "react-bits.splash-cursor": { quality: "low", contained: true },
  "react-bits.prismatic-burst": { quality: "low" },
};

export function safeProps(effect: ReactBitsEffect): Record<string, unknown> {
  const props: Record<string, unknown> = { ...effect.props };
  for (const [key, ceiling] of Object.entries(ceilings[effect.id] ?? {}))
    props[key] = Math.min(Number(props[key] ?? ceiling), ceiling);
  return { ...props, ...fixed[effect.id] };
}
