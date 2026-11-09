import { describe, expect, it } from "vitest";
import { validateMediaBlock } from "./media-validation.ts";
import type { PresentationBlock } from "./presentation.ts";

type MediaBlock = Extract<PresentationBlock, { kind: "media" }>;
type Events = Parameters<typeof validateMediaBlock>[1];
const assets = new Map([
  ["door", { type: "image" as const }],
  ["sky", { type: "image" as const }],
  ["rain", { type: "audio" as const }],
  ["clip", { type: "video" as const }],
]);
const block = (change: Record<string, unknown> = {}) =>
  ({ kind: "media", id: "door-block", image: "door", layout: "inline", ...change }) as MediaBlock;
const issues = (media: MediaBlock, events: Events = []) => {
  const found: string[] = [];
  validateMediaBlock(media, events, ["start.p1"], assets, (message) => found.push(message));
  return found;
};
const illustration = (change: Record<string, unknown> = {}) => ({
  base: { role: "background", x: 0, y: 0, scale: 1 },
  layers: [],
  wrap: "none",
  ...change,
});

const rejections: [string, Record<string, unknown>, string][] = [
  ["media that is not an image or video", { image: "rain" }, "Unknown block media"],
  ["missing media", { image: "ghost" }, "Unknown block media"],
  [
    "a parallax layer that is not an image",
    { motion: { layers: ["rain"] } },
    "Parallax layers must reference library images",
  ],
  [
    "timing on an unknown segment",
    { show: { kind: "segment", segmentId: "attic.p1" } },
    "Unknown image timing segment",
  ],
  [
    "a video as an illustration base",
    { image: "clip", illustration: illustration() },
    "Illustrations need an image base",
  ],
  [
    "an illustration layer that is not an image",
    { illustration: illustration({ layers: [{ image: "rain", role: "foreground" }] }) },
    "Illustration layers must reference library images",
  ],
  [
    "illustration layers mixed with legacy depth layers",
    { illustration: illustration(), motion: { layers: ["sky"] } },
    "Use illustration layers or legacy depth layers, not both",
  ],
  [
    "text wrapping outside an inline layout",
    { layout: "wide", illustration: illustration({ wrap: "left" }) },
    "Text wrapping requires an inline illustration",
  ],
  [
    "examining another image",
    { examination: { image: "sky" } },
    "Only non-cinematic images can be examined, using their own image",
  ],
  [
    "examining a video",
    { image: "clip", examination: { image: "clip" } },
    "Only non-cinematic images can be examined, using their own image",
  ],
];

describe("validateMediaBlock", () => {
  it("accepts an image or video shown on a known segment", () => {
    expect(issues(block({ show: { kind: "segment", segmentId: "start.p1" } }))).toEqual([]);
    expect(issues(block({ image: "clip" }))).toEqual([]);
  });

  it.each(rejections)("reports %s", (_, change, message) => {
    expect(issues(block(change))).toContain(message);
  });

  it("requires a blocking event for fullscreen media", () => {
    const fullscreen = block({ layout: "fullscreen" });
    const event = (blocking: boolean) =>
      ({ id: "cut", blockId: "door-block", blocking }) as Events[number];
    expect(issues(fullscreen)).toContain("Fullscreen media needs a bounded blocking event");
    expect(issues(fullscreen, [event(false)])).toContain(
      "Fullscreen media needs a bounded blocking event",
    );
    expect(issues(fullscreen, [event(true)])).toEqual([]);
  });

  it("does not allow examining fullscreen media", () => {
    expect(issues(block({ layout: "fullscreen", examination: { image: "door" } }))).toContain(
      "Only non-cinematic images can be examined, using their own image",
    );
  });
});
