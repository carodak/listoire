import { afterEach, expect, it, vi } from "vitest";
import { prefersReducedMotion, reducedMotionMedia } from "./reduced-motion.ts";

afterEach(() => vi.unstubAllGlobals());

it("reads the reduce-motion setting, and is false where there is no browser (REVIEW section 5 #6)", () => {
  expect(prefersReducedMotion()).toBe(false);
  const matchMedia = vi.fn((query: string) => ({ matches: query === reducedMotionMedia }));
  vi.stubGlobal("matchMedia", matchMedia);
  expect(prefersReducedMotion()).toBe(true);
  expect(matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
});
