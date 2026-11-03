import { it, expect } from "vitest";
import { CinematicSchema, cameraPresets } from "../../contracts/cinematic.ts";
import { cinematicFrames, cinematicDuration } from "./cinematic-presets.ts";
it("keeps camera motion bounded and weighted with distinct presets and depth", () => {
  for (const preset of cameraPresets) {
    const frames = cinematicFrames(CinematicSchema.parse({ preset }));
    expect(frames.length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(frames)).not.toMatch(/NaN|Infinity/);
  }
  const config = CinematicSchema.parse({ preset: "parallax" });
  expect(cinematicFrames(config, 0.5)).not.toEqual(cinematicFrames(config, 1.5));
  expect(cinematicFrames({ ...config, preset: "dramatic-push" })).not.toEqual(
    cinematicFrames({ ...config, preset: "slow-reveal" }),
  );
  expect(cinematicDuration("slow")).toBeGreaterThan(cinematicDuration("normal"));
  expect(CinematicSchema.safeParse({ ...config, layers: ["a", "b", "c", "d", "e"] }).success).toBe(
    false,
  );
});
