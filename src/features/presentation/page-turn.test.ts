import { expect, it } from "vitest";
import { effectKeyframes } from "./effect-keyframes.ts";
import { dissolveWords } from "./page-departure.ts";

it("uses a short vertical departure for legacy page-turn cues", () => {
  for (const direction of ["forward", "back"] as const) {
    const frames = effectKeyframes(
      { id: "page-turn", direction, duration: 300, target: "canvas" },
      {} as HTMLElement,
    );
    expect(frames).toHaveLength(2);
    expect(frames.at(-1)?.transform).toBe(`translateY(${direction === "forward" ? -22 : 22}px)`);
    expect(frames.every((frame) => !frame.clipPath)).toBe(true);
  }
});

it("does not create an overlay for reduced motion or an aborted departure", async () => {
  await dissolveWords({} as HTMLElement, new AbortController().signal, true, "forward");
  const scope = new AbortController();
  scope.abort();
  await dissolveWords({} as HTMLElement, scope.signal, false, "forward");
});
