import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { BundleSchema } from "../../contracts/story.ts";
import { InkNarrativeEngine } from "./ink-engine.ts";
import { createCharacter } from "../character/create-character.ts";
import { StoryDirector } from "./director.ts";
import { SaveManager } from "../../persistence/save-manager.ts";
import { createIndexedDbStore } from "../../persistence/indexeddb-store.ts";

function house(locale: "en" | "fr") {
  return BundleSchema.parse(
    JSON.parse(
      readFileSync(
        new URL(`../../../public/stories/house/${locale}.json`, import.meta.url),
        "utf8",
      ),
    ),
  );
}
const reference = JSON.parse(
  readFileSync(new URL("../../../tests/fixtures/house-reference.json", import.meta.url), "utf8"),
);

describe("complete bilingual house story", () => {
  for (const locale of ["en", "fr"] as const)
    for (const song of [false, true])
      for (const light of [false, true])
        for (const photo of [false, true])
          for (const examine of [false, true]) {
            it(`${locale}: song=${song}, light=${light}, photo=${photo}, examine=${examine}`, () => {
              const bundle = house(locale);
              let engine = new InkNarrativeEngine(bundle);
              let frame = engine.advance();
              const passages: string[] = [];
              const snapshot = () => {
                if (locale === "en")
                  expect(
                    frame.segments
                      .filter((segment) => !segment.id.endsWith(".clue"))
                      .map((segment) => segment.text),
                  ).toEqual(reference[frame.passageId].p);
                const serialized = engine.serialize();
                engine = new InkNarrativeEngine(bundle);
                engine.restore(serialized, frame);
                expect(engine.serialize()).toBe(serialized);
                passages.push(frame.passageId);
              };
              snapshot();
              if (examine) {
                engine.choose("examine-photo");
                frame = engine.advance();
                snapshot();
                expect(frame.facts?.examined).toBe(true);
                expect(frame.actions).toEqual([]);
                expect(() => engine.choose("examine-photo")).toThrow("content");
              }
              for (const choice of [
                "intro.call",
                song ? "call.song" : "call.room",
                `${song ? "song" : "room"}.arrival`,
                light ? "arrival.light" : "arrival.break",
                `${light ? "light" : "break"}.last`,
                photo ? "last.photo" : "last.window",
                `${photo ? "photo" : "window"}.end`,
              ]) {
                engine.choose(choice);
                frame = engine.advance();
                snapshot();
              }
              expect(frame.choices).toEqual([]);
              expect(frame.passageId).toBe("end");
              expect(frame.facts).toMatchObject({
                brasskey: !light,
                hiddenclue: light,
                caller: song ? -5 : 5,
                girl: photo ? -10 : -30,
                examined: examine,
              });
              expect(passages).toContain("arrival");
              expect(passages).toContain("last");
            });
          }
  it("keeps translated IDs, choices, facts and conditional segments identical", () => {
    const engines = [new InkNarrativeEngine(house("en")), new InkNarrativeEngine(house("fr"))];
    for (const choice of [
      undefined,
      "examine-photo",
      "intro.call",
      "call.song",
      "song.arrival",
      "arrival.light",
      "light.last",
      "last.photo",
      "photo.end",
    ]) {
      const frames = engines.map((engine) => {
        if (choice) engine.choose(choice);
        return engine.advance();
      });
      const shape = (frame: (typeof frames)[number]) => ({
        passage: frame.passageId,
        segments: frame.segments.map((s) => s.id),
        choices: frame.choices.map((c) => c.id),
        actions: frame.actions?.map((a) => a.id),
        facts: frame.facts,
      });
      expect(shape(frames[0]!)).toEqual(shape(frames[1]!));
    }
  });
  it("rolls back photograph discovery if its atomic save fails", async () => {
    const bundle = house("en");
    const saves = new SaveManager(createIndexedDbStore());
    const director = new StoryDirector(bundle, new InkNarrativeEngine(bundle), saves, () =>
      createCharacter(["close-reading", "composure"], () => 4),
    );
    await director.restart();
    const before = await saves.read(bundle);
    const commit = vi.spyOn(saves, "commit").mockRejectedValueOnce(new Error("storage"));
    await director.choose("examine-photo", director.getSnapshot().occurrenceId!);
    expect(director.getSnapshot().frame?.facts?.examined).toBe(false);
    expect(await saves.read(bundle)).toEqual(before);
    commit.mockRestore();
    await director.choose("examine-photo", director.getSnapshot().occurrenceId!);
    const saved = await saves.read(bundle);
    expect(saved?.frame.facts?.examined).toBe(true);
    const restored = new StoryDirector(bundle, new InkNarrativeEngine(bundle), saves, () =>
      createCharacter(["close-reading", "composure"], () => 4),
    );
    await restored.load();
    expect(restored.getSnapshot().restored).toBe(true);
    expect(restored.getSnapshot().frame).toEqual(saved?.frame);
  });
  it("rejects tampered saved facts and bundles only selected optimized assets", () => {
    const bundle = house("en");
    const engine = new InkNarrativeEngine(bundle);
    const frame = engine.advance();
    expect(() =>
      engine.restore(engine.serialize(), { ...frame, facts: { ...frame.facts, brasskey: true } }),
    ).toThrow("save-invalid");
    const ids = new Set(bundle.assets?.map((asset) => asset.id));
    const refs = new Set(
      Object.values(bundle.scenes!).flatMap((scene) => [scene.image, scene.sound].filter(Boolean)),
    );
    refs.add(bundle.character!.portrait);
    refs.add(bundle.cover);
    for (const scene of Object.values(bundle.scenes!))
      for (const block of scene.blocks ?? []) if (block.kind === "media") refs.add(block.image);
    for (const clip of bundle.narration ?? []) refs.add(clip.assetId);
    for (const scene of Object.values(bundle.scenes!))
      for (const event of scene.events ?? []) {
        if (event.action.kind === "audio") refs.add(event.action.assetId);
        if (
          event.action.kind === "effect" &&
          "image" in event.action.effect &&
          event.action.effect.image
        )
          refs.add(event.action.effect.image);
      }
    for (const asset of bundle.assets!)
      if (asset.type === "image")
        expect(
          asset.id.startsWith("heritage.") ||
            ["tcp.human8-cutout", "tcp.human5-cutout"].includes(asset.id),
        ).toBe(true);
    expect(ids).toEqual(refs);
    expect(bundle.assets!.filter((asset) => !asset.id.startsWith("narration."))).toHaveLength(9);
    for (const asset of bundle.assets!) {
      const source = readFileSync(new URL(`../../../stories/house/${asset.path}`, import.meta.url));
      const published = readFileSync(
        new URL(`../../../public/stories/house/${asset.path}`, import.meta.url),
      );
      expect(createHash("sha256").update(source).digest("hex")).toBe(
        createHash("sha256").update(published).digest("hex"),
      );
    }
  });
});
