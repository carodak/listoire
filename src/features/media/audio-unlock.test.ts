import { afterEach, expect, it, vi } from "vitest";
import { unlockAudio } from "./audio-unlock.ts";

afterEach(() => vi.unstubAllGlobals());

// Runs first: the module keeps one context once a browser has created it.
it("does nothing where Web Audio is unavailable or refuses to start", () => {
  vi.stubGlobal("AudioContext", undefined);
  expect(() => unlockAudio()).not.toThrow();
  vi.stubGlobal(
    "AudioContext",
    class {
      constructor() {
        throw new Error("NotAllowedError");
      }
    },
  );
  expect(() => unlockAudio()).not.toThrow();
});

it("creates one audio context in the gesture and resumes it on every later gesture", () => {
  const resume = vi.fn(() => Promise.resolve());
  const created = vi.fn();
  vi.stubGlobal(
    "AudioContext",
    class {
      resume = resume;
      constructor() {
        created();
      }
    },
  );
  unlockAudio();
  unlockAudio();
  expect(created).toHaveBeenCalledTimes(1);
  expect(resume).toHaveBeenCalledTimes(2);
});
