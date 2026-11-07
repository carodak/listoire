import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { BundleSchema } from "./story.ts";
import { mediaIsVisible } from "./presentation.ts";

it("shares delayed, revealed and expired media visibility between playback and rendering", () => {
  const block = {
    kind: "media" as const,
    id: "picture",
    image: "photo",
    layout: "inline" as const,
    show: { kind: "delay" as const },
  };
  const state = { visibleMedia: [] as string[], expiredMedia: [] as string[], revealAll: false };
  expect(mediaIsVisible(block, state)).toBe(false);
  expect(mediaIsVisible(block, { ...state, visibleMedia: ["picture"] })).toBe(true);
  expect(mediaIsVisible(block, { ...state, revealAll: true })).toBe(true);
  expect(mediaIsVisible(block, { ...state, revealAll: true, expiredMedia: ["picture"] })).toBe(
    false,
  );
});

it("rejects reordered text, unknown media/cues, premature choices and colors outside the artistic palette", () => {
  const source = JSON.parse(
    readFileSync(new URL("../../public/stories/house/en.json", import.meta.url), "utf8"),
  );
  const changes = [
    (bundle: typeof source) =>
      bundle.scenes.intro.blocks[0].illustration.layers.push({
        image: "missing",
        role: "foreground",
        x: 0,
        y: 0,
        scale: 1,
      }),
    (bundle: typeof source) =>
      bundle.scenes.intro.blocks[0].illustration.layers.push({
        image: bundle.scenes.intro.blocks[0].image,
        rotation: 999,
        role: "foreground",
        x: 0,
        y: 0,
        scale: 1,
      }),
    (bundle: typeof source) => (bundle.scenes.intro.blocks[0].illustration.wrap = "left"),
    (bundle: typeof source) => bundle.scenes.intro.blocks.reverse(),
    (bundle: typeof source) =>
      (bundle.scenes.intro.blocks.find((block: { kind: string }) => block.kind === "media").image =
        "unknown"),
    (bundle: typeof source) => (bundle.scenes.intro.events[0].blockId = "unknown"),
    (bundle: typeof source) =>
      (bundle.scenes.song.events.find(
        (event: { action: { kind: string } }) => event.action.kind === "effect",
      ).action.effect = {
        id: "react-bits.dark-veil",
        duration: 1800,
        props: { color: "#ff0000" },
      }),
    (bundle: typeof source) =>
      bundle.scenes.room.events.forEach((event: { blocking: boolean }) => (event.blocking = false)),
  ];
  expect(BundleSchema.safeParse(source).success).toBe(true);
  for (const change of changes) {
    const bundle = structuredClone(source);
    change(bundle);
    expect(BundleSchema.safeParse(bundle).success).toBe(false);
  }
});
