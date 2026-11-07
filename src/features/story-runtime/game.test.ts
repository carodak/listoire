import { expect, it } from "vitest";
import { compileProject } from "../editor/compiler.ts";
import { StoryProjectSchema } from "../../contracts/editor-project.ts";
import { GameDefinitionSchema } from "../../contracts/game.ts";
import { defaultReadingPreferences } from "../../contracts/presentation.ts";
import { createCharacter } from "../character/create-character.ts";
import { InkNarrativeEngine } from "./ink-engine.ts";
import { StoryDirector } from "./director.ts";
import { SaveManager } from "../../persistence/save-manager.ts";

async function fixture() {
  const game = GameDefinitionSchema.parse({
    abilities: [
      { id: "strike", attribute: "STR", offensive: true },
      { id: "insight", attribute: "WIL" },
    ],
    encounters: [{ id: "guard", name: "Guard", difficulty: "easy", profile: "resilient" }],
    actions: [
      { id: "battle", label: "Fight", kind: "combat", reference: "guard" },
      { id: "check", label: "Check", kind: "stat-check", attribute: "DEX" },
    ],
  });
  const project = StoryProjectSchema.parse({
    schemaVersion: 1,
    storyId: "house",
    release: "test",
    defaultLocale: "en",
    gameMode: "with-combat",
    variables: [],
    languages: {
      en: {
        script:
          "-> start\n=== start ===\nA guard waits.\n+ [Fight # game:battle]\n    {game_success: Victory.| Escape or defeat.}\n    -> END\n+ [Check # game:check]\n    {game_success: Passed.| Failed.}\n    -> END",
        description: "",
        missingTranslation: false,
        configuration: {
          title: "Game",
          chapter: "Test",
          game,
          character: {
            portrait: "",
            abilities: [
              { id: "strike", name: "Strike", description: "" },
              { id: "insight", name: "Insight", description: "" },
            ],
            inventory: [],
            encounters: [],
          },
        },
        defaults: defaultReadingPreferences,
        narrationMode: "disabled",
      },
    },
  });
  const bundle = (await compileProject(project)).en!;
  const memory = new Map<string, unknown>();
  let reject = false;
  const saves = new SaveManager({
    read: async (key) => memory.get(key),
    update: async (key, update) => {
      if (reject) throw new Error("storage unavailable");
      memory.set(key, update(memory.get(key)));
    },
  });
  const create = () =>
    new StoryDirector(bundle, new InkNarrativeEngine(bundle), saves, () =>
      createCharacter(["strike", "insight"], () => 4),
    );
  return {
    bundle,
    saves,
    create,
    fail: (value: boolean) => {
      reject = value;
    },
  };
}
it("persists a frozen combat and RNG, restores it, then commits its branch and XP once", async () => {
  const { bundle, saves, create } = await fixture();
  const director = create();
  await director.load();
  expect(director.getSnapshot().failure).toBeNull();
  const fight = director
    .getSnapshot()
    .frame!.choices.find((choice) => choice.gameAction === "battle")!;
  await director.choose(fight.id, director.getSnapshot().occurrenceId!);
  expect(director.getSnapshot().game!.combat).toBeDefined();
  const frozen = structuredClone(director.getSnapshot().game);
  const restored = create();
  await restored.load();
  expect(restored.getSnapshot().game).toEqual(frozen);
  for (let turn = 0; turn < 20 && restored.getSnapshot().game?.combat; turn++)
    await restored.gameTurn({ kind: "attack" }, restored.getSnapshot().occurrenceId!);
  expect(restored.getSnapshot().game!.combat).toBeUndefined();
  expect(restored.getSnapshot().game!.xp).toBe(1);
  expect(restored.getSnapshot().frame!.segments[0]!.text).toMatch(/Victory|defeat/);
  const save = await saves.read(bundle);
  expect(save!.game).toEqual(restored.getSnapshot().game);
});
it("rolls back Ink, character, XP and random state when a check cannot be saved", async () => {
  const { bundle, saves, create, fail } = await fixture();
  const director = create();
  await director.load();
  const before = await saves.backup(bundle),
    game = structuredClone(director.getSnapshot().game);
  const check = director
    .getSnapshot()
    .frame!.choices.find((choice) => choice.gameAction === "check")!;
  fail(true);
  await director.choose(check.id, director.getSnapshot().occurrenceId!);
  expect(director.getSnapshot().failure).toBe("storage");
  expect(director.getSnapshot().game).toEqual(game);
  expect(await saves.backup(bundle)).toBe(before);
  fail(false);
  await director.choose(check.id, director.getSnapshot().occurrenceId!);
  expect(director.getSnapshot().failure).toBeNull();
  expect(director.getSnapshot().game!.xp).toBe(1);
});
it("retains the exact combat checkpoint after a failed turn or restart", async () => {
  const { bundle, saves, create, fail } = await fixture();
  const director = create();
  await director.load();
  const fight = director
    .getSnapshot()
    .frame!.choices.find((choice) => choice.gameAction === "battle")!;
  await director.choose(fight.id, director.getSnapshot().occurrenceId!);
  const before = await saves.backup(bundle);
  const snapshot = structuredClone(director.getSnapshot());
  fail(true);
  await director.gameTurn({ kind: "attack" }, snapshot.occurrenceId!);
  expect(director.getSnapshot()).toMatchObject({ ...snapshot, failure: "storage" });
  await director.restart();
  expect(director.getSnapshot()).toMatchObject({ ...snapshot, failure: "storage" });
  expect(await saves.backup(bundle)).toBe(before);
  fail(false);
  await director.gameTurn({ kind: "attack" }, snapshot.occurrenceId!);
  expect(director.getSnapshot().failure).toBeNull();
  expect(director.getSnapshot().game!.rng).not.toBe(snapshot.game!.rng);
});
