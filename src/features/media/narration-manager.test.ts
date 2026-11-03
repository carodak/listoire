import { expect, it, vi, afterEach } from "vitest";
import { NarrationManager, textDigest } from "./narration-manager.ts";
import { AudioManager } from "./audio-manager.ts";
import { fixtureBundle } from "../../test-fixtures.ts";
afterEach(() => vi.unstubAllGlobals());
it("verifies approved audio bytes and uses media timestamps for text marks", async () => {
  const bytes = new TextEncoder().encode("recording fixture");
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
  const bundle = fixtureBundle();
  bundle.assets = [{ id: "voice", path: "media/voice.mp3", type: "audio", alt: "" }];
  bundle.narration = [
    {
      segmentId: "threshold.key",
      locale: "en",
      spokenTextDigest: await textDigest("Hello"),
      voiceId: "voice",
      assetId: "voice",
      audioDigest: digest,
      durationMs: 1000,
      marks: [{ character: 2, startMs: 200, endMs: 300 }],
      approval: { status: "approved", reviewer: "author", rightsReference: "test" },
    },
  ];
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(bytes)));
  const node = Object.assign(new EventTarget(), {
    currentTime: 0,
    duration: 1,
    volume: 1,
    loop: false,
    playbackRate: 1,
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
  });
  const manager = new NarrationManager(new AudioManager(() => node as unknown as HTMLAudioElement));
  const progress = vi.fn();
  const playing = manager.play(
    { passageId: "threshold", segments: [{ id: "threshold.key", text: "Hello" }], choices: [] },
    bundle,
    { rate: 1, deviceVoice: false },
    new AbortController().signal,
    progress,
  );
  await vi.waitFor(() => expect(node.play).toHaveBeenCalled());
  node.currentTime = 0.25;
  node.dispatchEvent(new Event("timeupdate"));
  expect(progress).toHaveBeenCalledWith({ segmentId: "threshold.key", characters: 2, done: false });
  node.dispatchEvent(new Event("ended"));
  expect(await playing).toBe("ended");
  expect(progress).toHaveBeenLastCalledWith({
    segmentId: "threshold.key",
    characters: 5,
    done: true,
  });
});
it("matches exact locale/text and does not play a stale or wrong-language clip", async () => {
  const bundle = fixtureBundle();
  const frame = {
    passageId: "threshold",
    segments: [{ id: "threshold.key", text: "Exact text." }],
    choices: [],
  };
  bundle.narration = [
    {
      segmentId: "threshold.key",
      locale: "fr",
      spokenTextDigest: await textDigest("Different"),
      voiceId: "voice",
      assetId: "clip",
      audioDigest: "0".repeat(64),
      durationMs: 1000,
      marks: [],
      approval: { status: "approved", reviewer: "author", rightsReference: "test" },
    },
  ];
  const factory = vi.fn();
  const audio = new AudioManager(factory);
  const progress = vi.fn();
  expect(
    await new NarrationManager(audio).play(
      frame,
      bundle,
      { rate: 1, deviceVoice: false },
      new AbortController().signal,
      progress,
    ),
  ).toBe("unavailable");
  expect(factory).not.toHaveBeenCalled();
  expect(progress).toHaveBeenCalledWith({ segmentId: "threshold.key", characters: 11, done: true });
});
it("device narration cancellation releases ducking and ignores late completion", async () => {
  const audio = new AudioManager();
  let resolve!: (value: "aborted") => void;
  const stop = vi.fn(() => resolve("aborted"));
  vi.spyOn(audio, "speak").mockImplementation((_text, _locale, _rate, signal) => {
    signal.addEventListener("abort", stop, { once: true });
    return {
      finished: new Promise((done) => {
        resolve = done;
      }),
      stop,
      pause() {},
      resume() {},
      seek() {},
    };
  });
  const duck = vi.spyOn(audio, "setDucking");
  const manager = new NarrationManager(audio);
  const scope = new AbortController();
  const playing = manager.play(
    { passageId: "threshold", segments: [{ id: "threshold.key", text: "Hello" }], choices: [] },
    fixtureBundle(),
    { rate: 1, deviceVoice: true },
    scope.signal,
    vi.fn(),
  );
  await vi.waitFor(() => expect(audio.speak).toHaveBeenCalled());
  scope.abort();
  expect(await playing).toBe("aborted");
  expect(duck).toHaveBeenLastCalledWith(false);
});
