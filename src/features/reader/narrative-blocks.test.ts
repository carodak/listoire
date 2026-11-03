import { expect, it } from "vitest";
import type { PresentationBlock } from "../../contracts/presentation.ts";
import { reachedBlocks, presentationBlocks } from "./narrative-blocks.ts";
import { fixtureBundle } from "../../test-fixtures.ts";

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
