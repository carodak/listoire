import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { BundleSchema } from "./story.ts";
import { mediaIsVisible, SceneSchema } from "./presentation.ts";
import { IllustrationSchema, illustrationDefaults } from "./illustration.ts";

it("validates exit transitions when parsing a scene, before publication", () => {
  const event = {
    id: "exit",
    phase: "exit",
    blockId: "page",
    trigger: { kind: "passage" },
    action: { kind: "effect", effect: { id: "fade-out", duration: 300 } },
  };
  const scene = { title: "Exit", progress: 0, events: [event] };
  expect(SceneSchema.safeParse(scene).success).toBe(true);
  expect(
    SceneSchema.safeParse({
      ...scene,
      events: [{ ...event, action: { kind: "effect", effect: { id: "fade-in", duration: 300 } } }],
    }).success,
  ).toBe(false);
  expect(
    SceneSchema.safeParse({ ...scene, events: [{ ...event, blockId: "picture" }] }).success,
  ).toBe(false);
});

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
  source.artDirection = {
    style: "fixture",
    colorMode: "grayscale",
    palette: ["#ffffff", "#000000", "#ffe2a2", "#c7a55c"],
    complexity: "simple",
  };
  const picture = (bundle: typeof source) =>
    bundle.scenes.chemin.blocks.find((block: { kind: string }) => block.kind === "media");
  const changes = [
    (bundle: typeof source) =>
      picture(bundle).illustration.layers.push({
        image: "missing",
        role: "foreground",
        x: 0,
        y: 0,
        scale: 1,
      }),
    (bundle: typeof source) =>
      picture(bundle).illustration.layers.push({
        image: picture(bundle).image,
        rotation: 999,
        role: "foreground",
        x: 0,
        y: 0,
        scale: 1,
      }),
    (bundle: typeof source) =>
      (bundle.scenes.messagere.blocks.find(
        (block: { kind: string }) => block.kind === "media",
      ).illustration = { ...structuredClone(picture(bundle).illustration), wrap: "left" }),
    (bundle: typeof source) => bundle.scenes.atelier.blocks.reverse(),
    (bundle: typeof source) => (picture(bundle).image = "unknown"),
    (bundle: typeof source) => (bundle.scenes.chemin.events[0].blockId = "unknown"),
    (bundle: typeof source) =>
      bundle.scenes.lueur.events.push({
        id: "invalid-color",
        blockId: "page",
        trigger: { kind: "passage" },
        action: {
          kind: "effect",
          effect: { id: "light-flicker", duration: 300, color: "#ff0000" },
        },
      }),
    (bundle: typeof source) =>
      bundle.scenes.passage.events.forEach(
        (event: { blocking: boolean }) => (event.blocking = false),
      ),
  ];
  expect(BundleSchema.safeParse(source).success).toBe(true);
  for (const change of changes) {
    const bundle = structuredClone(source);
    change(bundle);
    expect(BundleSchema.safeParse(bundle).success).toBe(false);
  }
});

it("accepts tilt and flip on a picture, and old pictures parse unchanged", () => {
  const old = illustrationDefaults("background", ["sketch.tree"]);
  expect(IllustrationSchema.parse(old)).toEqual(old);
  const tilted = {
    ...old,
    layers: [{ ...old.layers[0]!, tiltX: -75, tiltY: 30, flip: true }],
  };
  expect(IllustrationSchema.parse(tilted)).toEqual(tilted);
  for (const tilt of [{ tiltX: 76 }, { tiltY: -80 }, { flip: "yes" }])
    expect(() => IllustrationSchema.parse({ ...old, base: { ...old.base, ...tilt } })).toThrow();
});
