import { expect, it, vi, afterEach } from "vitest";
import { NarrationManager } from "./narration-manager.ts";
import { textDigest } from "../../contracts/digest.ts";
import { AudioManager } from "./audio-manager.ts";
import { fixtureBundle } from "../../test-fixtures.ts";
afterEach(() => vi.unstubAllGlobals());
it("requests the next local paragraph while the first recording is still playing", async () => {
  const bytes = new TextEncoder().encode("prefetch fixture");
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
  const bundle = { ...fixtureBundle(), narrationMode: "ai-live" as const };
  bundle.assets = [{ id: "recording.first", path: "media/first.mp3", type: "audio", alt: "" }];
  bundle.narration = [
    {
      segmentId: "first",
      locale: "en",
      spokenTextDigest: await textDigest("First."),
      voiceId: "nano-default",
      assetId: "recording.first",
      audioDigest: digest,
      durationMs: 1000,
      marks: [],
      approval: { status: "approved", reviewer: "test", rightsReference: "test" },
    },
  ];
  const fetch = vi.fn(async (_url: unknown, options?: RequestInit) =>
    options?.method === "POST" ? new Response("{}", { status: 503 }) : new Response(bytes),
  );
  vi.stubGlobal("fetch", fetch);
  const node = Object.assign(new EventTarget(), {
    currentTime: 0,
    duration: 1,
    volume: 1,
    loop: false,
    playbackRate: 1,
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
  });
  const audio = new AudioManager(() => node as unknown as HTMLAudioElement);
  const scope = new AbortController();
  const playing = new NarrationManager(audio).play(
    {
      passageId: "threshold",
      segments: [
        { id: "first", text: "First." },
        { id: "next", text: "Next." },
      ],
      choices: [],
    },
    bundle,
    { rate: 1, deviceVoice: false, settings: () => ({ rate: 1, voiceId: "nano-default" }) },
    scope.signal,
    vi.fn(),
  );
  await vi.waitFor(() => expect(node.play).toHaveBeenCalledOnce());
  await vi.waitFor(() =>
    expect(
      fetch.mock.calls.some(
        ([, options]) =>
          options?.method === "POST" && JSON.parse(options.body as string).segmentId === "next",
      ),
    ).toBe(true),
  );
  scope.abort();
  expect(await playing).toBe("aborted");
  audio.dispose();
});
it("reads device paragraphs in one utterance and maps boundaries back to their segments", async () => {
  const audio = new AudioManager();
  const speak = vi
    .spyOn(audio, "speak")
    .mockImplementation((text, _locale, _rate, _signal, boundary) => {
      expect(text).toBe("First. Second.");
      boundary(7, 6);
      return Promise.resolve("ended");
    });
  const progress = vi.fn();
  const bundle = { ...fixtureBundle(), narrationMode: "ai-live" as const };
  const result = await new NarrationManager(audio).play(
    {
      passageId: "threshold",
      segments: [
        { id: "one", text: "First." },
        { id: "two", text: "Second." },
      ],
      choices: [],
    },
    bundle,
    { rate: 1, deviceVoice: true, settings: () => ({ rate: 1, voiceId: "device:test" }) },
    new AbortController().signal,
    progress,
  );
  expect(result).toBe("ended");
  expect(speak).toHaveBeenCalledTimes(1);
  expect(progress.mock.calls.map(([event]) => event)).toEqual([
    { segmentId: "one", characters: 6, done: true },
    { segmentId: "two", characters: 6, done: false },
    { segmentId: "two", characters: 7, done: true },
  ]);
  audio.dispose();
});
it.each([false, true])(
  "uses explicit editor preview context (%s), independently of authored Ink",
  async (editorPreview) => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 503 }));
    vi.stubGlobal("fetch", fetch);
    const bundle = { ...fixtureBundle(), authored: true, narrationMode: "ai-live" as const };
    await new NarrationManager(new AudioManager(), editorPreview).play(
      { passageId: "threshold", segments: [{ id: "threshold.key", text: "Hello" }], choices: [] },
      bundle,
      { rate: 1, deviceVoice: false, settings: () => ({ rate: 1, voiceId: "nano-default" }) },
      new AbortController().signal,
      vi.fn(),
    );
    expect(fetch).toHaveBeenCalledWith(
      editorPreview ? "/api/narration/editor-preview" : "/api/narration",
      expect.objectContaining({ method: "POST" }),
    );
  },
);
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
    return new Promise((done) => {
      resolve = done;
    });
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
