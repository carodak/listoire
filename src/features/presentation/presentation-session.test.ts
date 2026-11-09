import { afterEach, expect, it, vi } from "vitest";
import { defaultReadingPreferences } from "../../contracts/presentation.ts";
import type { PlaybackResult } from "../media/audio-manager.ts";
import { NarrationManager } from "../media/narration-manager.ts";
import type { NarrationProgress } from "../../contracts/media.ts";
import { fixtureBundle } from "../../test-fixtures.ts";
import { PresentationSession } from "./presentation-session.ts";
import { AudioManager } from "../media/audio-manager.ts";
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
  session.revealRemaining();
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
it("starts segment sound effects at narration onset, once, and retains them in instant text mode", async () => {
  vi.useFakeTimers();
  const bundle = fixtureBundle();
  bundle.assets = [{ id: "bell", path: "media/bell.mp3", type: "audio", alt: "Bell" }];
  bundle.embeddedAudio = { bell: "data:audio/mpeg;base64,SUQz" };
  bundle.scenes = {
    threshold: {
      title: "Sound",
      progress: 0,
      events: [
        {
          id: "bell-cue",
          trigger: { kind: "segment", segmentId: "threshold.key" },
          blocking: false,
          action: { kind: "audio", assetId: "bell", channel: "sfx" },
        },
      ],
    },
  };
  let progress!: (value: NarrationProgress) => void;
  vi.spyOn(NarrationManager.prototype, "play").mockImplementation(
    async (_frame, _bundle, _options, _signal, onProgress) => {
      progress = onProgress;
      return new Promise(() => {});
    },
  );
  const audio = new AudioManager();
  const play = vi.spyOn(audio, "play").mockReturnValue(Promise.resolve("ended"));
  const session = new PresentationSession(
    bundle,
    { ...defaultReadingPreferences, sound: true, narration: true, reveal: "instant" },
    audio,
  );
  session.start(
    {
      passageId: "threshold",
      segments: [{ id: "threshold.key", text: "The bell rings." }],
      choices: [],
    },
    "sound",
    false,
  );
  session.segmentReached("threshold.key");
  session.segmentRevealed("threshold.key");
  session.bind({ canvas: {} as HTMLElement });
  await vi.advanceTimersByTimeAsync(1);
  expect(play).not.toHaveBeenCalled();
  progress({ segmentId: "threshold.key", characters: 1, done: false });
  await vi.advanceTimersByTimeAsync(1);
  expect(play).toHaveBeenCalledOnce();
  expect(play).toHaveBeenCalledWith(expect.objectContaining({ url: bundle.embeddedAudio.bell }));
  progress({ segmentId: "threshold.key", characters: 14, done: true });
  session.segmentRevealed("threshold.key");
  await vi.advanceTimersByTimeAsync(1);
  expect(play).toHaveBeenCalledOnce();
  session.dispose();
});
it("resumes only visible videos and keeps expired or not-yet-visible media silent", async () => {
  vi.useFakeTimers();
  const bundle = fixtureBundle();
  bundle.scenes = {
    threshold: {
      title: "Timed video",
      progress: 0,
      blocks: [
        {
          kind: "media",
          id: "clip",
          image: "movie",
          layout: "inline",
          show: { kind: "delay", delayMs: 100 },
          durationMs: 100,
        },
        { kind: "choices" },
      ],
    },
  };
  const session = new PresentationSession(bundle, defaultReadingPreferences);
  session.start(
    { passageId: "threshold", segments: [{ id: "threshold.key", text: "Hello" }], choices: [] },
    "one",
    false,
  );
  const video = { readyState: 2, play: vi.fn(async () => {}), pause: vi.fn() };
  session.bind({ canvas: {} as HTMLElement, video: video as unknown as HTMLVideoElement }, "clip");
  session.pause();
  session.resume();
  expect(video.play).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(100);
  expect(video.play).toHaveBeenCalledOnce();
  session.pause();
  session.resume();
  expect(video.play).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(100);
  session.pause();
  session.resume();
  expect(video.play).toHaveBeenCalledTimes(2);
  session.dispose();
});
it("waits for video data before starting its bounded fullscreen cue and removes pending listeners on departure", async () => {
  vi.useFakeTimers();
  let finish!: (result: "aborted") => void;
  const play = vi.spyOn(EffectsEngine.prototype, "play").mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const bundle = fixtureBundle();
  bundle.scenes = {
    threshold: {
      title: "Video",
      progress: 0,
      blocks: [
        { kind: "media", id: "clip", image: "movie", layout: "fullscreen" },
        { kind: "choices" },
      ],
      events: [
        {
          id: "clip.cinematic",
          trigger: { kind: "block", blockId: "clip" },
          blockId: "clip",
          blocking: true,
          action: { kind: "effect", effect: { id: "video-playback", duration: 1000 } },
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
  const video = Object.assign(new EventTarget(), {
    readyState: 0,
    play: vi.fn(async () => {}),
    pause: vi.fn(),
    volume: 1,
    muted: false,
  });
  session.bind({ canvas: {} as HTMLElement, video: video as unknown as HTMLVideoElement }, "clip");
  await vi.advanceTimersByTimeAsync(1);
  expect(play).not.toHaveBeenCalled();
  video.readyState = 2;
  video.dispatchEvent(new Event("loadeddata"));
  await vi.advanceTimersByTimeAsync(1);
  expect(play).toHaveBeenCalledOnce();
  expect(session.getSnapshot().blocking).toBe(true);
  expect(video.volume).toBe(0.65);
  session.dispose();
  finish("aborted");
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

it("keeps the same music track across authored pages and cancels it when the player is disposed", async () => {
  vi.useFakeTimers();
  const audio = new AudioManager();
  const play = vi.spyOn(audio, "play").mockReturnValue(new Promise(() => {}));
  const bundle = {
    ...fixtureBundle(),
    authored: true,
    assets: [{ id: "music", path: "media/music.mp3", type: "audio" as const, alt: "" }],
    scenes: {
      threshold: {
        title: "Threshold",
        progress: 0,
        events: [
          {
            id: "music-cue",
            trigger: { kind: "passage" as const },
            action: {
              kind: "audio" as const,
              assetId: "music",
              channel: "music" as const,
              loop: true,
            },
          },
        ],
      },
    },
  };
  const session = new PresentationSession(
    bundle,
    { ...defaultReadingPreferences, sound: true },
    audio,
  );
  const frame = {
    passageId: "threshold",
    segments: [{ id: "threshold.key", text: "Hello" }],
    choices: [],
  };
  session.start(frame, "first", false);
  await vi.advanceTimersByTimeAsync(1);
  const signal = play.mock.calls[0]![0].signal;
  session.cancel();
  session.start(frame, "replay", false);
  await vi.advanceTimersByTimeAsync(1);
  expect(play).toHaveBeenCalledOnce();
  expect(signal.aborted).toBe(false);
  session.pause();
  session.reset();
  expect(signal.aborted).toBe(true);
  expect(session.getSnapshot().paused).toBe(false);
  session.start(frame, "new-run", false);
  await vi.advanceTimersByTimeAsync(1);
  expect(play).toHaveBeenCalledTimes(2);
  const restartedSignal = play.mock.calls[1]![0].signal;
  expect(restartedSignal).not.toBe(signal);
  session.dispose();
  expect(restartedSignal.aborted).toBe(true);
});
it("ignores late voice completion after replay and voice-off within the same passage", async () => {
  const completions: ((result: PlaybackResult) => void)[] = [];
  vi.spyOn(NarrationManager.prototype, "play").mockImplementation(
    () => new Promise((resolve) => completions.push(resolve)),
  );
  const preferences = { ...defaultReadingPreferences, narration: true };
  const session = new PresentationSession(fixtureBundle(), preferences);
  session.start(
    { passageId: "threshold", segments: [{ id: "threshold.key", text: "Hello" }], choices: [] },
    "run:1",
    false,
  );
  session.replayNarration();
  completions[0]!("aborted");
  await Promise.resolve();
  expect(session.getSnapshot().voice).toBe("playing");
  session.configure({ ...preferences, narration: false });
  completions[1]!("aborted");
  await Promise.resolve();
  expect(session.getSnapshot().voice).toBe("off");
  expect(session.getSnapshot().revealAll).toBe(true);
  session.dispose();
});
it("retains late timing marks while paused so resuming cannot strand a segment", () => {
  let progress!: (value: NarrationProgress) => void;
  vi.spyOn(NarrationManager.prototype, "play").mockImplementation(
    (_frame, _bundle, _options, _signal, onProgress) => {
      progress = onProgress;
      return new Promise(() => {});
    },
  );
  const session = new PresentationSession(fixtureBundle(), {
    ...defaultReadingPreferences,
    narration: true,
  });
  session.start(
    { passageId: "threshold", segments: [{ id: "threshold.key", text: "Hello" }], choices: [] },
    "run:1",
    false,
  );
  session.pause();
  progress({ segmentId: "threshold.key", characters: 5, done: true });
  expect(session.getSnapshot().paused).toBe(true);
  expect(session.getSnapshot().progress["threshold.key"]).toBe(5);
  session.resume();
  expect(session.getSnapshot().progress["threshold.key"]).toBe(5);
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
