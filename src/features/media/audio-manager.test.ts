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
