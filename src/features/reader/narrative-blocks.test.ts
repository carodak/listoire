import { expect, it } from "vitest";
import type { PresentationBlock } from "../../contracts/presentation.ts";
import { reachedBlocks, presentationBlocks, bookMediaLayout } from "./narrative-blocks.ts";
import { fixtureBundle } from "../../test-fixtures.ts";
import { Scene3DSchema } from "../../contracts/scene3d.ts";

it("keeps newly authored paragraphs in Ink order around existing illustration anchors", () => {
  const bundle = {
    ...fixtureBundle(),
    authored: true,
    scenes: {
      start: {
        title: "Start",
        progress: 0,
        blocks: [
          { kind: "text" as const, segmentId: "start.one" },
          { kind: "media" as const, id: "image", image: "portrait", layout: "inline" as const },
          { kind: "text" as const, segmentId: "start.two" },
          { kind: "choices" as const },
        ],
      },
    },
  };
  const frame = {
    passageId: "start",
    segments: [
      { id: "start.one", text: "First" },
      { id: "start.new", text: "New paragraph" },
      { id: "start.two", text: "Last" },
    ],
    choices: [],
  };
  expect(
    presentationBlocks(bundle, frame).map((block) =>
      block.kind === "text" ? block.segmentId : block.kind,
    ),
  ).toEqual(["start.one", "media", "start.new", "start.two", "choices"]);
});

it("gates media behind text and later paragraphs/choices behind a fullscreen moment", () => {
  const blocks: PresentationBlock[] = [
    { kind: "text", segmentId: "one" },
    { kind: "media", id: "film", image: "portrait", layout: "fullscreen" },
    { kind: "text", segmentId: "two" },
    { kind: "choices" },
  ];
  const paragraphs = [
    { id: "one", text: "Hello", visible: "He" },
    { id: "two", text: "Later", visible: "Later" },
  ];
  expect(reachedBlocks(blocks, paragraphs, [], false)).toHaveLength(1);
  paragraphs[0]!.visible = "Hello";
  expect(reachedBlocks(blocks, paragraphs, [], false)).toHaveLength(2);
  expect(reachedBlocks(blocks, paragraphs, ["film"], false)).toHaveLength(4);
  expect(reachedBlocks(blocks, paragraphs, [], true)).toHaveLength(4);
});

it("keeps media sharing an Ink anchor in authored order and shows the latest reached right page", () => {
  const blocks: PresentationBlock[] = [
    { kind: "media", id: "old", image: "portrait", layout: "right" },
    {
      kind: "media",
      id: "new",
      image: "portrait",
      layout: "right",
      show: { kind: "delay", delayMs: 1000 },
    },
    { kind: "text", segmentId: "start.one" },
    { kind: "choices" },
  ];
  const bundle = {
    ...fixtureBundle(),
    authored: true,
    scenes: { start: { title: "Start", progress: 0, blocks } },
  };
  const ordered = presentationBlocks(bundle, {
    passageId: "start",
    segments: [{ id: "start.one", text: "Hello" }],
    choices: [],
    mediaAnchors: [{ id: "old" }, { id: "new" }],
  });
  expect(ordered).toEqual(blocks);
  const media = { visibleMedia: [], expiredMedia: [], revealAll: false };
  expect(bookMediaLayout(bundle, ordered, ordered, media).right?.id).toBe("old");
  expect(
    bookMediaLayout(bundle, ordered, ordered, { ...media, visibleMedia: ["new"] }).right?.id,
  ).toBe("new");
  expect(
    bookMediaLayout(bundle, ordered, ordered.slice(0, 1), { ...media, revealAll: true }).right?.id,
  ).toBe("old");
});

it("gives wide 3D illustrations the book width while retaining authored page artwork", () => {
  const blocks: PresentationBlock[] = [
    { kind: "media", id: "old", image: "portrait", layout: "right" },
    { kind: "media", id: "scene", image: "illustration", layout: "wide" },
  ];
  const bundle = fixtureBundle();
  const media = { visibleMedia: [], expiredMedia: [], revealAll: true };
  expect(bookMediaLayout(bundle, blocks, blocks, media).wide).toBe(false);
  bundle.assets = [
    {
      id: "illustration",
      type: "image",
      path: "/illustration.webp",
      alt: "Courtyard",
      scene3d: Scene3DSchema.parse({
        version: 1,
        title: "Courtyard",
        elements: [{ assetId: "knight", layer: "main" }],
        style: "toon",
        position: "center",
        shot: "medium",
        ambience: "mist",
        particles: "none",
        blend: true,
        cinematic: { preset: "none" },
      }),
    },
  ];
  expect(bookMediaLayout(bundle, blocks, blocks, media)).toMatchObject({
    wide: true,
    right: { id: "old" },
  });
  expect(blocks).toHaveLength(2);
});
