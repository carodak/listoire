import { afterEach, expect, it, vi } from "vitest";
import { defaultReadingPreferences } from "../../contracts/presentation.ts";
import type { PlaybackResult } from "../media/audio-manager.ts";
import { NarrationManager } from "../media/narration-manager.ts";
import { fixtureBundle } from "../../test-fixtures.ts";
import { PresentationSession } from "./presentation-session.ts";

afterEach(() => vi.restoreAllMocks());
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
