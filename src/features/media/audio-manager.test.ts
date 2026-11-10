import { expect, it, vi } from "vitest";
import { AudioManager } from "./audio-manager.ts";
it("starts the next spoken page after the previous page was canceled while paused", async () => {
  const utterances: SpeechSynthesisUtterance[] = [];
  let paused = false;
  const synth = {
    getVoices: () => [{ voiceURI: "test", lang: "en-US" }],
    cancel: vi.fn(),
    pause: () => {
      paused = true;
    },
    resume: () => {
      paused = false;
    },
    speak: (utterance: SpeechSynthesisUtterance) => {
      if (!paused) utterances.push(utterance);
    },
  };
  vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      constructor(public text: string) {}
    },
  );
  const audio = new AudioManager();
  try {
    const first = audio.speak("First page", "en", 1, new AbortController().signal, vi.fn());
    audio.pause();
    audio.stopChannel("narration");
    expect(await first).toBe("aborted");
    audio.resume();
    expect(paused).toBe(true);
    const second = audio.speak("Next page", "en", 1, new AbortController().signal, vi.fn());
    expect(utterances.map((utterance) => utterance.text)).toEqual(["First page", "Next page"]);
    utterances[1]!.onend!(new Event("end") as SpeechSynthesisEvent);
    expect(await second).toBe("ended");
  } finally {
    audio.dispose();
    vi.unstubAllGlobals();
  }
});
class FakeAudio extends EventTarget {
  volume = 1;
  loop = false;
  playbackRate = 1;
  currentTime = 0;
  duration = 10;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
}
it("fades page sounds at both ends and releases fade timers on cancellation", async () => {
  vi.useFakeTimers();
  const node = new FakeAudio();
  const manager = new AudioManager(() => node as unknown as HTMLAudioElement);
  const playback = manager.play({
    url: "fading",
    channel: "sfx",
    signal: new AbortController().signal,
    fadeMs: 1000,
  });
  expect(node.volume).toBe(0);
  node.currentTime = 0.5;
  await vi.advanceTimersByTimeAsync(32);
  expect(node.volume).toBeCloseTo(0.325);
  node.currentTime = 9.5;
  await vi.advanceTimersByTimeAsync(32);
  expect(node.volume).toBeCloseTo(0.325);
  manager.stopAll();
  await playback;
  const volume = node.volume;
  node.currentTime = 4;
  await vi.advanceTimersByTimeAsync(100);
  expect(node.volume).toBe(volume);
  manager.dispose();
  vi.useRealTimers();
});
it("remembers the latest narration speed before a delayed clip is created", async () => {
  const node = new FakeAudio();
  const manager = new AudioManager(() => node as unknown as HTMLAudioElement);
  manager.setRate(1.4);
  const playback = manager.play({
    url: "delayed",
    channel: "narration",
    rate: 0.8,
    signal: new AbortController().signal,
  });
  expect(node.playbackRate).toBe(1.4);
  manager.setRate(1.2);
  expect(node.playbackRate).toBe(1.2);
  manager.stopAll();
  expect(await playback).toBe("aborted");
  manager.dispose();
});
it("mixes channels, fades backgrounds, controls transport and settles cancellation", async () => {
  vi.useFakeTimers();
  const nodes: FakeAudio[] = [];
  const manager = new AudioManager(() => {
    const node = new FakeAudio();
    nodes.push(node);
    return node as unknown as HTMLAudioElement;
  });
  const scope = new AbortController();
  const music = manager.play({ url: "music", channel: "music", loop: true, signal: scope.signal });
  manager.setVolume("music", 0.8);
  manager.setDucking(true);
  expect(nodes[0]!.volume).toBeCloseTo(0.8);
  await vi.advanceTimersByTimeAsync(300);
  expect(nodes[0]!.volume).toBeGreaterThan(0.2);
  expect(nodes[0]!.volume).toBeLessThan(0.8);
  await vi.advanceTimersByTimeAsync(324);
  expect(nodes[0]!.volume).toBeCloseTo(0.2);
  manager.setMuted(true);
  expect(nodes[0]!.volume).toBe(0);
  manager.setMuted(false);
  manager.setDucking(false);
  manager.pause();
  expect(nodes[0]!.pause).toHaveBeenCalled();
  manager.resume();
  const voice = manager.play({ url: "voice", channel: "narration", signal: scope.signal });
  manager.setRate(1.5);
  expect(nodes[1]!.playbackRate).toBe(1.5);
  scope.abort();
  expect(await music).toBe("aborted");
  expect(await voice).toBe("aborted");
  manager.dispose();
  expect(vi.getTimerCount()).toBe(0);
  vi.useRealTimers();
});
it("bounds overlapping SFX and tolerates blocked or never-starting playback", async () => {
  vi.useFakeTimers();
  const node = new FakeAudio();
  node.play.mockRejectedValue(new Error("blocked"));
  const manager = new AudioManager(() => node as unknown as HTMLAudioElement);
  expect(
    await manager.play({ url: "sfx", channel: "sfx", signal: new AbortController().signal }),
  ).toBe("blocked");
  node.play.mockImplementation(() => new Promise(() => {}));
  const hung = manager.play({ url: "sfx", channel: "sfx", signal: new AbortController().signal });
  await vi.advanceTimersByTimeAsync(15000); // no progress for 15 s (was a fixed 4 s start limit)
  expect(await hung).toBe("timeout");
  manager.dispose();
  vi.useRealTimers();
});
it("crossfades backgrounds and cleans up both the incoming and outgoing resources", async () => {
  vi.useFakeTimers();
  const nodes: FakeAudio[] = [];
  const manager = new AudioManager(() => {
    const audio = new FakeAudio();
    nodes.push(audio);
    return audio as unknown as HTMLAudioElement;
  });
  const scope = new AbortController();
  const old = manager.play({
    url: "old",
    channel: "ambience",
    loop: true,
    signal: scope.signal,
    gain: 0.4,
  });
  const incoming = manager.crossfade("ambience", "new", scope.signal, 100);
  expect(nodes[0]!.volume).toBeCloseTo(0.12);
  await vi.advanceTimersByTimeAsync(160);
  expect(await old).toBe("aborted");
  expect(nodes[1]!.volume).toBeCloseTo(0.3);
  scope.abort();
  expect(await incoming).toBe("aborted");
  manager.dispose();
  vi.useRealTimers();
});
it("waits for a slow start instead of giving up after a fixed delay (REVIEW #13)", async () => {
  vi.useFakeTimers();
  const node = new FakeAudio();
  let started!: () => void;
  node.play.mockImplementation(() => new Promise<void>((resolve) => (started = resolve)));
  const manager = new AudioManager(() => node as unknown as HTMLAudioElement);
  const settled = vi.fn();
  void manager
    .play({ url: "slow", channel: "narration", signal: new AbortController().signal })
    .then(settled);
  await vi.advanceTimersByTimeAsync(6000); // slow network: playback begins after 6 s
  started();
  await vi.advanceTimersByTimeAsync(0);
  expect(settled).not.toHaveBeenCalled();
  expect(node.pause).not.toHaveBeenCalled();
  node.dispatchEvent(new Event("ended"));
  await vi.advanceTimersByTimeAsync(0);
  expect(settled).toHaveBeenCalledWith("ended");
  manager.dispose();
  vi.useRealTimers();
});
it("never cuts a track that is still playing, however long it runs", async () => {
  vi.useFakeTimers();
  const node = new FakeAudio();
  node.duration = 300;
  const manager = new AudioManager(() => node as unknown as HTMLAudioElement);
  const settled = vi.fn();
  void manager
    .play({ url: "long", channel: "music", signal: new AbortController().signal })
    .then(settled);
  // e.g. a slowed-down voice or a long music track: still advancing after 200 s.
  for (let second = 1; second <= 200; second++) {
    node.currentTime = second;
    await vi.advanceTimersByTimeAsync(1000);
  }
  expect(settled).not.toHaveBeenCalled();
  manager.dispose();
  vi.useRealTimers();
});
it("still gives up on a track that makes no progress, but not while paused", async () => {
  vi.useFakeTimers();
  const node = new FakeAudio();
  const manager = new AudioManager(() => node as unknown as HTMLAudioElement);
  const settled = vi.fn();
  void manager
    .play({ url: "stalled", channel: "sfx", signal: new AbortController().signal })
    .then(settled);
  manager.pause();
  await vi.advanceTimersByTimeAsync(60000);
  expect(settled).not.toHaveBeenCalled();
  manager.resume();
  await vi.advanceTimersByTimeAsync(16000);
  expect(settled).toHaveBeenCalledWith("timeout");
  manager.dispose();
  vi.useRealTimers();
});
