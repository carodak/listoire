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
  vi.useRealTimers();
});

it("runs scene exit transitions on departure, never on entry", async () => {
  vi.useFakeTimers();
  const play = vi
    .spyOn(EffectsEngine.prototype, "play")
    .mockReturnValue({ finished: Promise.resolve("ended"), stop() {}, pause() {}, resume() {} });
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
  expect(play.mock.calls.map((call) => call[0].id)).toEqual(["fade-in"]);
  await session.leave();
  expect(play.mock.calls.at(-1)![0]).toMatchObject({ id: "fade-out", duration: 900 });
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
  await vi.advanceTimersByTimeAsync(200);
  expect(session.getSnapshot().expiredMedia).toContain("delayed");
  session.dispose();
});

it("keeps the same music track across authored pages and cancels it when the player is disposed", async () => {
  vi.useFakeTimers();
  const audio = new AudioManager();
  const play = vi.spyOn(audio, "play").mockReturnValue({
    finished: new Promise(() => {}),
    stop() {},
    pause() {},
    resume() {},
    seek() {},
  });
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
  session.dispose();
  expect(signal.aborted).toBe(true);
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
