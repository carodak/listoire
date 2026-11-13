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
  const session = new PresentationSession(bundle, {
    ...defaultReadingPreferences,
    reveal: "progressive",
  });
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
  expect(session.getProgress()["threshold.key"]).toBe(5);
  session.resume();
  expect(session.getProgress()["threshold.key"]).toBe(5);
  session.dispose();
});
