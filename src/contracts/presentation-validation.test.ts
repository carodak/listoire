import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { BundleSchema } from "./story.ts";

it("rejects reordered text, unknown media/cues, premature choices and colors outside the artistic palette", () => {
  const source = JSON.parse(
    readFileSync(new URL("../../public/stories/house/en.json", import.meta.url), "utf8"),
  );
  const changes = [
    (bundle: typeof source) => bundle.scenes.intro.blocks.reverse(),
    (bundle: typeof source) =>
      (bundle.scenes.intro.blocks.find((block: { kind: string }) => block.kind === "media").image =
        "unknown"),
    (bundle: typeof source) => (bundle.scenes.intro.events[0].blockId = "unknown"),
    (bundle: typeof source) => (bundle.scenes.song.events[1].action.effect.props.color = "#ff0000"),
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
