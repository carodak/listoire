import { afterEach, expect, it, vi } from "vitest";
import { playRecording } from "./narration-clips.ts";
import { sha256 } from "../../contracts/digest.ts";
import type { AudioManager } from "./audio-manager.ts";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("gives a long clip enough time to download on a slow connection (REVIEW #13)", async () => {
  const bytes = new Uint8Array(400_000);
  const limits: number[] = [];
  const timeout = AbortSignal.timeout.bind(AbortSignal);
  vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
    limits.push(ms);
    return timeout(ms);
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(bytes)),
  );
  vi.stubGlobal(
    "URL",
    Object.assign(URL, { createObjectURL: () => "blob:clip", revokeObjectURL: vi.fn() }),
  );
  const audio = { setDucking: vi.fn(), play: vi.fn(async () => "ended" as const) };
  const clip = {
    segmentId: "page.p1",
    locale: "en",
    voiceId: "narrator",
    spokenTextDigest: "0".repeat(64),
    assetId: "narration.clip",
    audioDigest: await sha256(bytes),
    durationMs: 60_000,
    marks: [],
    approval: { status: "approved" as const, reviewer: "test", rightsReference: "test" },
  };
  const result = await playRecording(
    audio as unknown as AudioManager,
    clip,
    "A long page.",
    "/stories/house/media/narration.clip.mp3",
    1,
    new AbortController().signal,
    vi.fn(),
  );
  expect(result).toBe("ended");
  // A 60 s clip used to get 5 s in total, which mobile networks often miss.
  expect(limits[0]).toBeGreaterThanOrEqual(clip.durationMs);
});
