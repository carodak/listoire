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
    items: [{ id: "letter", name: "Letter", slot: "none" }],
    actions: [
      { id: "battle", label: "Fight", kind: "combat", reference: "guard" },
      { id: "check", label: "Check", kind: "stat-check", attribute: "DEX" },
      { id: "letter", label: "Letter received", kind: "give-item", reference: "letter" },
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
          "-> start\n=== start ===\nA guard waits.\n+ [Fight # game:battle]\n    {game_success: Victory.| Escape or defeat.}\n    -> END\n+ [Check # game:check]\n    {game_success: Passed.| Failed.}\n    -> END\n+ [Take the letter # game:letter]\n    You open the letter.\n    -> END",
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
  expect(restored.getSnapshot().frame!.segments[0]!.text).toBe("A guard waits.");
  expect(restored.getSnapshot().game!.pendingEvent).toBeDefined();
  const waiting = create();
  await waiting.load();
  expect(waiting.getSnapshot().game).toEqual(restored.getSnapshot().game);
  await restored.finishEvent(restored.getSnapshot().occurrenceId!);
  expect(restored.getSnapshot().frame!.segments[0]!.text).toMatch(/Victory|defeat/);
  const save = await saves.read(bundle);
  expect(save!.game).toEqual(restored.getSnapshot().game);
});
it.each(["battle", "letter"])(
  "back after %s restores the page with the stats it had then",
  async (action) => {
    const { create } = await fixture();
    const director = create();
    await director.load();
    const before = structuredClone(director.getSnapshot());
    const choice = before.frame!.choices.find((choice) => choice.gameAction === action)!;
    await director.choose(choice.id, before.occurrenceId!);
    for (let turn = 0; turn < 20 && director.getSnapshot().game?.combat; turn++)
      await director.gameTurn({ kind: "attack" }, director.getSnapshot().occurrenceId!);
    await director.finishEvent(director.getSnapshot().occurrenceId!);
    expect(director.getSnapshot().game).not.toEqual(before.game);
    await director.back();
    expect(director.getSnapshot().frame).toEqual(before.frame);
    expect(director.getSnapshot().character).toEqual(before.character);
    expect(director.getSnapshot().game).toEqual(before.game);
  },
);
it("shows a received item before leaving, restores the event, and never duplicates its mutation on retry", async () => {
  const { create, fail } = await fixture();
  const director = create();
  await director.load();
  const frame = director.getSnapshot().frame;
  const choice = frame!.choices.find((choice) => choice.gameAction === "letter")!;
  await director.choose(choice.id, director.getSnapshot().occurrenceId!);
  expect(director.getSnapshot().frame).toEqual(frame);
  expect(director.getSnapshot().game!.inventory).toEqual(["letter"]);
  const restored = create();
  await restored.load();
  expect(restored.getSnapshot().game!.pendingEvent?.choiceId).toBe(choice.id);
  fail(true);
  await restored.finishEvent(restored.getSnapshot().occurrenceId!);
  expect(restored.getSnapshot().frame).toEqual(frame);
  expect(restored.getSnapshot().game!.inventory).toEqual(["letter"]);
  expect(restored.getSnapshot().game!.pendingEvent).toBeDefined();
  fail(false);
  await restored.finishEvent(restored.getSnapshot().occurrenceId!);
  expect(restored.getSnapshot().frame!.segments[0]!.text).toBe("You open the letter.");
  expect(restored.getSnapshot().game!.pendingEvent).toBeUndefined();
  expect(restored.getSnapshot().game!.inventory).toEqual(["letter"]);
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
  expect(director.getSnapshot().game!.pendingCheck?.rolled).toBe(true);
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

it("rolls on the action click, restores its result, and advances only after confirmation", async () => {
  const { create, fail } = await fixture();
  const director = create();
  await director.load();
  const before = structuredClone(director.getSnapshot());
  const check = before.frame!.choices.find((choice) => choice.gameAction === "check")!;
  await director.choose(check.id, before.occurrenceId!);
  expect(director.getSnapshot().frame).toEqual(before.frame);
  expect(director.getSnapshot().game!.rng).not.toEqual(before.game!.rng);
  const waiting = create();
  await waiting.load();
  expect(waiting.getSnapshot().game!.pendingCheck?.rolled).toBe(true);
  const rolled = structuredClone(waiting.getSnapshot().game);
  expect(rolled!.lastResult!.dice!.length).toBeGreaterThan(0);
  await waiting.rollCheck(waiting.getSnapshot().occurrenceId!);
  expect(waiting.getSnapshot().game).toEqual(rolled);
  const restored = create();
  await restored.load();
  expect(restored.getSnapshot().game).toEqual(rolled);
  const frameBeforeConfirmation = structuredClone(restored.getSnapshot().frame);
  fail(true);
  await restored.finishCheck(restored.getSnapshot().occurrenceId!);
  expect(restored.getSnapshot().failure).toBe("storage");
  expect(restored.getSnapshot().game).toEqual(rolled);
  expect(restored.getSnapshot().frame).toEqual(frameBeforeConfirmation);
  fail(false);
  await restored.finishCheck(restored.getSnapshot().occurrenceId!);
  expect(restored.getSnapshot().game!.pendingCheck).toBeUndefined();
  expect(restored.getSnapshot().frame!.segments[0]!.text).toMatch(/Passed|Failed/);
  expect(restored.getSnapshot().game!.rng).toEqual(rolled!.rng);
  await restored.back();
  expect(restored.getSnapshot().frame).toEqual(before.frame);
  expect(restored.getSnapshot().game).toEqual(before.game);
  expect(restored.getSnapshot().character).toEqual(before.character);
  await restored.choose(check.id, restored.getSnapshot().occurrenceId!);
  await restored.rollCheck(restored.getSnapshot().occurrenceId!);
  await restored.back();
  expect(restored.getSnapshot().game).toEqual(before.game);
  expect(restored.getSnapshot().frame).toEqual(before.frame);
});

it.each([false, true])(
  "keeps legacy checkpoints safe when their roll is already complete: %s",
  async (rolled) => {
    const { bundle, saves, create } = await fixture();
    const director = create();
    await director.load();
    const before = structuredClone(director.getSnapshot().game);
    const choice = director
      .getSnapshot()
      .frame!.choices.find((choice) => choice.gameAction === "check")!;
    await director.choose(choice.id, director.getSnapshot().occurrenceId!);
    if (rolled) await director.rollCheck(director.getSnapshot().occurrenceId!);
    const saved = (await saves.read(bundle))!;
    const legacy = structuredClone(saved);
    if (!rolled) {
      const origin = legacy.game!.pendingCheck!.origin!;
      legacy.character = origin.character;
      Object.assign(legacy.game!, {
        rng: origin.rng,
        xp: origin.xp,
        baseMaxHp: origin.baseMaxHp,
        lastResult: origin.lastResult,
      });
      legacy.game!.pendingCheck!.rolled = false;
    }
    delete legacy.game!.pendingCheck!.origin;
    legacy.revision++;
    await saves.commit(bundle, legacy, saved);
    const restored = create();
    await restored.load();
    if (rolled) {
      await restored.finishCheck(restored.getSnapshot().occurrenceId!);
      await restored.back();
      expect(restored.getSnapshot().game).toEqual(legacy.game);
      await restored.rollCheck(restored.getSnapshot().occurrenceId!);
      expect(restored.getSnapshot().game).toEqual(legacy.game);
    } else {
      await restored.rollCheck(restored.getSnapshot().occurrenceId!);
      expect(restored.getSnapshot().game!.pendingCheck!.origin).toBeDefined();
      await restored.back();
      expect(restored.getSnapshot().game).toEqual(before);
    }
  },
);
