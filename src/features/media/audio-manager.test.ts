import { expect, it, vi } from "vitest";
import { AudioManager } from "./audio-manager.ts";
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
  playback.stop();
  await playback.finished;
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
  playback.stop();
  expect(await playback.finished).toBe("aborted");
  manager.dispose();
});
it("mixes channels, ducks backgrounds, controls transport and settles cancellation", async () => {
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
  expect(nodes[0]!.volume).toBeCloseTo(0.2);
  manager.setMuted(true);
  expect(nodes[0]!.volume).toBe(0);
  manager.setMuted(false);
  manager.setDucking(false);
  manager.pause();
  expect(nodes[0]!.pause).toHaveBeenCalled();
  manager.resume();
  music.seek(3);
  expect(nodes[0]!.currentTime).toBe(3);
  const voice = manager.play({ url: "voice", channel: "narration", signal: scope.signal });
  manager.setRate(1.5);
  expect(nodes[1]!.playbackRate).toBe(1.5);
  scope.abort();
  expect(await music.finished).toBe("aborted");
  expect(await voice.finished).toBe("aborted");
  manager.dispose();
});
it("bounds overlapping SFX and tolerates blocked or never-starting playback", async () => {
  vi.useFakeTimers();
  const node = new FakeAudio();
  node.play.mockRejectedValue(new Error("blocked"));
  const manager = new AudioManager(() => node as unknown as HTMLAudioElement);
  expect(
    await manager.play({ url: "sfx", channel: "sfx", signal: new AbortController().signal })
      .finished,
  ).toBe("blocked");
  node.play.mockImplementation(() => new Promise(() => {}));
  const hung = manager.play({ url: "sfx", channel: "sfx", signal: new AbortController().signal });
  await vi.advanceTimersByTimeAsync(4000);
  expect(await hung.finished).toBe("timeout");
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
  const old = manager.play({ url: "old", channel: "ambience", loop: true, signal: scope.signal });
  const incoming = manager.crossfade("ambience", "new", scope.signal, 100);
  await vi.advanceTimersByTimeAsync(160);
  expect(await old.finished).toBe("aborted");
  expect(nodes[1]!.volume).toBeCloseTo(0.3);
  scope.abort();
  expect(await incoming.finished).toBe("aborted");
  manager.dispose();
  vi.useRealTimers();
});
