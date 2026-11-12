import { expect, it } from "vitest";
import { ReactBitsEffectSchema } from "../../../contracts/effects.ts";
import { safeProps } from "./safety.ts";

const effect = (id: string, props: Record<string, unknown>) =>
  ReactBitsEffectSchema.parse({ id, duration: 1000, props });

it("caps an effect's cost but keeps cheaper authored values", () => {
  expect(safeProps(effect("react-bits.particles", { particleCount: 30, pixelRatio: 0.5 }))).toEqual(
    { particleCount: 30, pixelRatio: 0.5 },
  );
  expect(safeProps(effect("react-bits.particles", { particleCount: 150, speed: 2 }))).toEqual({
    particleCount: 60,
    pixelRatio: 1,
    speed: 2,
  });
  expect(safeProps(effect("react-bits.noise", { fps: 6 }))).toMatchObject({ fps: 6 });
});

it("never lets an effect flicker, and keeps the low quality", () => {
  expect(safeProps(effect("react-bits.noise", { flicker: 0.05 }))).toMatchObject({ flicker: 0 });
  expect(safeProps(effect("react-bits.light-pillar", { quality: "medium" }))).toMatchObject({
    quality: "low",
    resolution: 0.5,
  });
});
