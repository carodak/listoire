import { afterEach, expect, it, vi } from "vitest";
import { playTypingSound } from "./typing-sound.ts";

afterEach(() => vi.unstubAllGlobals());

it("attempts the recording once, tolerates autoplay rejection and pauses on cleanup", async () => {
  const audio = {
    play: vi.fn().mockRejectedValue(new DOMException("Autoplay blocked", "NotAllowedError")),
    pause: vi.fn(),
  };
  const constructor = vi.fn(function () {
    return audio;
  });
  vi.stubGlobal("Audio", constructor);
  const stop = playTypingSound();
  await Promise.resolve();
  expect(constructor).toHaveBeenCalledWith("/audio/keyboard-typing.mp3");
  expect(audio.play).toHaveBeenCalledTimes(1);
  stop();
  expect(audio.pause).toHaveBeenCalledTimes(1);
});
