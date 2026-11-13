import { afterEach, expect, it, vi } from "vitest";
import { defaultReadingPreferences } from "../../contracts/presentation.ts";
import { fixtureBundle } from "../../test-fixtures.ts";
import { PresentationSession } from "./presentation-session.ts";
import { EffectsEngine } from "./effects.ts";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("reveals all text without completing or stopping an illustration animation", async () => {
  vi.useFakeTimers();
  let finish!: (result: "ended") => void;
  const play = vi.spyOn(EffectsEngine.prototype, "play").mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const stop = vi.spyOn(EffectsEngine.prototype, "stop");
  const bundle = fixtureBundle();
  bundle.scenes = {
    threshold: {
      title: "Illustration",
      progress: 0,
      events: [
        {
          id: "camera",
          blockId: "picture",
          trigger: { kind: "block", blockId: "picture" },
          blocking: false,
          action: { kind: "effect", effect: { id: "slow-zoom", duration: 2000, scale: 1.1 } },
        },
      ],
    },
  };
  const session = new PresentationSession(bundle, {
    ...defaultReadingPreferences,
    narration: false,
    reveal: "instant",
  });
  session.start(
    { passageId: "threshold", segments: [{ id: "threshold.key", text: "Hello" }], choices: [] },
    "new",
    false,
  );
  session.bind({ canvas: {} as HTMLElement }, "picture");
  await vi.advanceTimersByTimeAsync(1);
  expect(play).toHaveBeenCalledOnce();
  stop.mockClear();
  const listener = vi.fn();
  const unsubscribe = session.subscribe(listener);
  session.revealRemaining();
  // One update: the text and every image of the page become visible together.
  expect(listener).toHaveBeenCalledOnce();
  unsubscribe();
  expect(stop).not.toHaveBeenCalled();
  expect(session.getSnapshot()).toMatchObject({
    revealAll: true,
    skipMedia: false,
    completedBlocks: [],
  });
  finish("ended");
  await Promise.resolve();
  expect(session.getSnapshot().completedBlocks).toContain("picture");
  session.skipCinematic();
  expect(session.getSnapshot().skipMedia).toBe(true);
  session.dispose();
});

it("keeps the paper surface opaque on entry and departure", async () => {
  vi.useFakeTimers();
  const play = vi.spyOn(EffectsEngine.prototype, "play").mockReturnValue(Promise.resolve("ended"));
  const bundle = fixtureBundle();
  bundle.scenes = {
    threshold: {
      title: "Test",
      progress: 0,
      events: [
        {
          id: "exit",
          phase: "exit",
          blockId: "page",
          trigger: { kind: "passage" },
          action: { kind: "effect", effect: { id: "fade-out", duration: 900, target: "canvas" } },
        },
      ],
    },
  };
  const session = new PresentationSession(bundle, defaultReadingPreferences);
  session.start(
    { passageId: "threshold", segments: [{ id: "threshold.key", text: "Hello" }], choices: [] },
    "one",
    false,
  );
  session.bindPage({} as HTMLElement);
  await vi.advanceTimersByTimeAsync(1);
  expect(play).not.toHaveBeenCalled();
  await session.leave();
  expect(play).not.toHaveBeenCalled();
  expect(session.getSnapshot().departed).toBe(true);
  session.dispose();
});

it("restarts image timing on replay and cancels an earlier page timer", async () => {
  vi.useFakeTimers();
  const bundle = {
    ...fixtureBundle(),
    authored: true,
    scenes: {
      threshold: {
        title: "Threshold",
        progress: 0,
        blocks: [
          { kind: "text" as const, segmentId: "threshold.key" },
          {
            kind: "media" as const,
            id: "delayed",
            image: "portrait",
            layout: "inline" as const,
            show: { kind: "delay" as const, delayMs: 100 },
            durationMs: 200,
          },
          { kind: "choices" as const },
        ],
      },
    },
  };
  const session = new PresentationSession(bundle, defaultReadingPreferences);
  const frame = {
    passageId: "threshold",
    segments: [{ id: "threshold.key", text: "Hello" }],
    choices: [],
  };
  session.start(frame, "first", false);
  await vi.advanceTimersByTimeAsync(50);
  session.start(frame, "replay", false);
  await vi.advanceTimersByTimeAsync(50);
  expect(session.getSnapshot().visibleMedia).toEqual([]);
  await vi.advanceTimersByTimeAsync(50);
  expect(session.getSnapshot().visibleMedia).toContain("delayed");
  await vi.advanceTimersByTimeAsync(500);
  expect(session.getSnapshot().expiredMedia).not.toContain("delayed");
  session.bind({ canvas: {} as HTMLElement }, "delayed");
  await vi.advanceTimersByTimeAsync(200);
  expect(session.getSnapshot().expiredMedia).toContain("delayed");
  session.dispose();
});

it("still shows and expires delayed images after a cinematic is skipped (REVIEW #9)", async () => {
  vi.useFakeTimers();
  const bundle = {
    ...fixtureBundle(),
    authored: true,
    scenes: {
      threshold: {
        title: "Threshold",
        progress: 0,
        blocks: [
          { kind: "text" as const, segmentId: "threshold.key" },
          {
            kind: "media" as const,
            id: "delayed",
            image: "portrait",
            layout: "inline" as const,
            show: { kind: "delay" as const, delayMs: 100 },
            durationMs: 200,
          },
          { kind: "choices" as const },
        ],
      },
    },
  };
  const session = new PresentationSession(bundle, {
    ...defaultReadingPreferences,
    reveal: "progressive",
  });
  session.start(
    { passageId: "threshold", segments: [{ id: "threshold.key", text: "Hello" }], choices: [] },
    "first",
    false,
  );
  session.skipCinematic();
  await vi.advanceTimersByTimeAsync(100);
  expect(session.getSnapshot().visibleMedia).toContain("delayed");
  session.bind({ canvas: {} as HTMLElement }, "delayed");
  await vi.advanceTimersByTimeAsync(200);
  expect(session.getSnapshot().expiredMedia).toContain("delayed");
  session.dispose();
});

it("autoplays silent illustrations on restored pages without unmuting them with story audio", async () => {
  vi.useFakeTimers();
  const bundle = fixtureBundle();
  bundle.scenes = {
    threshold: {
      title: "Illustration",
      progress: 0,
      blocks: [{ kind: "media", id: "clip", image: "movie", layout: "right" }],
    },
  };
  const session = new PresentationSession(bundle, defaultReadingPreferences);
  session.start(
    { passageId: "threshold", segments: [{ id: "threshold.key", text: "Hello" }], choices: [] },
    "one",
    true,
  );
  const video = Object.assign(new EventTarget(), {
    readyState: 0,
    play: vi.fn(async () => {}),
    pause: vi.fn(),
    volume: 1,
    muted: false,
  });
  session.bind(
    { canvas: {} as HTMLElement, video: video as unknown as HTMLVideoElement, silentVideo: true },
    "clip",
  );
  expect(video.play).not.toHaveBeenCalled();
  video.readyState = 2;
  video.dispatchEvent(new Event("loadeddata"));
  expect(video.play).toHaveBeenCalledOnce();
  session.configure({ ...defaultReadingPreferences, sound: true });
  expect(video.muted).toBe(true);
  session.pause();
  session.resume();
  expect(video.play).toHaveBeenCalledTimes(2);
  session.dispose();
  expect(video.pause).toHaveBeenCalled();
});

it("keeps automatic illustrations still when reduced motion is requested", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  const bundle = fixtureBundle();
  bundle.scenes = {
    threshold: {
      title: "Illustration",
      progress: 0,
      blocks: [{ kind: "media", id: "clip", image: "movie", layout: "right" }],
    },
  };
  const session = new PresentationSession(bundle, defaultReadingPreferences);
  session.start(
    { passageId: "threshold", segments: [{ id: "threshold.key", text: "Hello" }], choices: [] },
    "one",
    false,
  );
  const video = {
    readyState: 2,
    play: vi.fn(async () => {}),
    pause: vi.fn(),
    volume: 1,
    muted: false,
    removeEventListener() {},
  };
  session.bind(
    { canvas: {} as HTMLElement, video: video as unknown as HTMLVideoElement, silentVideo: true },
    "clip",
  );
  await vi.advanceTimersByTimeAsync(1);
  session.pause();
  session.resume();
  expect(video.play).not.toHaveBeenCalled();
  session.dispose();
});

it("starts an illustration's camera when one of its images fails to load, not before sources are set", async () => {
  vi.useFakeTimers();
  const play = vi.spyOn(EffectsEngine.prototype, "play").mockResolvedValue("ended");
  const bundle = fixtureBundle();
  bundle.scenes = {
    threshold: {
      title: "Illustration",
      progress: 0,
      events: [
        {
          id: "camera",
          blockId: "picture",
          trigger: { kind: "block", blockId: "picture" },
          blocking: false,
          action: { kind: "effect", effect: { id: "slow-zoom", duration: 2000, scale: 1.1 } },
        },
      ],
    },
  };
  const session = new PresentationSession(bundle, {
    ...defaultReadingPreferences,
    narration: false,
    reveal: "instant",
  });
  session.start(
    { passageId: "threshold", segments: [{ id: "threshold.key", text: "Hello" }], choices: [] },
    "new",
    false,
  );
  const loaded = { complete: true, naturalWidth: 800, currentSrc: "a.webp" };
  // The second image's source is still being resolved: no "src" yet.
  const pending = { complete: true, naturalWidth: 0, currentSrc: "" };
  const listeners: Record<string, () => void> = {};
  const canvas = {
    querySelectorAll: () => [loaded, pending],
    addEventListener: (type: string, listener: () => void) => (listeners[type] = listener),
    removeEventListener: () => {},
  } as unknown as HTMLElement;
  session.bind({ canvas }, "picture");
  await vi.advanceTimersByTimeAsync(1);
  expect(play).not.toHaveBeenCalled();
  // Its file is missing: it fails to load. The camera still starts.
  Object.assign(pending, { currentSrc: "missing.webp" });
  listeners.error!();
  await vi.advanceTimersByTimeAsync(1);
  expect(play).toHaveBeenCalledOnce();
  session.dispose();
});
