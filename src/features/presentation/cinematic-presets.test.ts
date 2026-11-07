import { it, expect } from "vitest";
import { CinematicSchema, cameraPresets } from "../../contracts/cinematic.ts";
import { cinematicFrames, cinematicDuration, cinematicPlaneFrames } from "./cinematic-presets.ts";
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
  const bookMotion = CinematicSchema.parse({ preset: "gentle-depth", durationMs: 6500 });
  expect(cinematicDuration(bookMotion.speed, bookMotion)).toBe(6500);
  expect(cinematicDuration("normal", CinematicSchema.parse({ preset: "gentle-depth" }))).toBe(6000);
  const push = CinematicSchema.parse({ preset: "cinematic-push-in" });
  expect(cinematicPlaneFrames(push, 800)).not.toEqual(cinematicPlaneFrames(push, 1600));
  const focus = CinematicSchema.parse({ preset: "character-focus" });
  expect(cinematicPlaneFrames(focus, 1600).at(-1)!.transform).toMatch(/^translate\(0%,0%\)/);
  expect(CinematicSchema.safeParse({ preset: "gentle-depth", durationMs: 999999 }).success).toBe(
    false,
  );
  expect(CinematicSchema.safeParse({ ...config, layers: ["a", "b", "c", "d", "e"] }).success).toBe(
    false,
  );
});

it("holds the high arrival at centre before a deep pullback and keeps handheld roll subtle", () => {
  const high = CinematicSchema.parse({ preset: "high-arrival-hold-pullback", intensity: "strong" });
  const frames = cinematicPlaneFrames(high, 800);
  expect(frames.map((frame) => frame.offset)).toEqual([0, 0.3, 0.6, 1]);
  expect(frames[1]!.transform).toBe(frames[2]!.transform);
  expect(frames.at(-1)!.transform).toContain("scale(0.55)");
  expect(cinematicDuration("normal", high)).toBe(11000);
  const diagonal = cinematicPlaneFrames(
    CinematicSchema.parse({ preset: "low-diagonal-pullback", intensity: "strong" }),
    800,
  );
  expect(diagonal[0]!.transform).toMatch(/translate\(-[\d.]+%,[\d.]+%\)/);
  const handheld = cinematicFrames(
    CinematicSchema.parse({ preset: "handheld-discovery", intensity: "strong" }),
  );
  for (const frame of handheld)
    expect(
      Math.abs(Number(String(frame.transform).match(/rotateZ\(([-\d.]+)deg\)/)![1])),
    ).toBeLessThan(0.06);
});
