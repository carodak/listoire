import { expect, it } from "vitest";
import { GameActionSchema, GameStateSchema } from "../../contracts/game.ts";
import { performAction } from "./actions.ts";
import { equip } from "./character.ts";
import {
  rulesDefinitions as definitions,
  rulesHero as hero,
  rulesState as state,
} from "../../test-fixtures.ts";

const action = (kind: string, reference: string, amount = 1) =>
  GameActionSchema.parse({ id: "test", label: "Test", kind, reference, amount });

it("learns and trains an ability once, then removes equipped gear without changing the RNG", () => {
  const character = hero(),
    game = state(),
    definition = definitions();
  definition.abilities.push({ ...definition.abilities[0]!, id: "new-skill" });
  const act = (kind: string, reference: string, amount = 1) =>
    performAction(character, game, definition, action(kind, reference, amount), "test");
  const rng = game.rng;
  act("learn", "new-skill");
  act("learn", "new-skill");
  act("train", "new-skill", 10);
  expect(character.abilities.filter((ability) => ability.id === "new-skill")).toEqual([
    { id: "new-skill", rank: 4 },
  ]);
  expect(() => act("train", "missing")).toThrow("Unknown ability");
  expect(() => act("learn", "missing")).toThrow("Unknown ability");
  act("give-item", "sword");
  equip(character, game, definition, "sword");
  act("remove-item", "sword");
  expect(game.equipment).toEqual({});
  expect(game.inventory).toEqual([]);
  character.health.current = 0;
  expect(() => act("learn", "new-skill")).toThrow("defeat");
  act("heal", "", 100);
  expect(character.health.current).toBe(character.health.max);
  expect(game.rng).toBe(rng);
});

it("applies ability-check rank thresholds 5,4,3,2 and awards 1 XP", () => {
  for (let currentRank = 1; currentRank <= 4; currentRank++) {
    const character = hero(),
      game = state();
    character.abilities[0]!.rank = currentRank;
    const check = GameActionSchema.parse({
      id: "test",
      label: "Check",
      kind: "ability-check",
      reference: "strike",
    });
    performAction(character, game, definitions(), check, "option-0");
    expect(game.lastResult!.success).toBe(game.lastResult!.roll >= 6 - currentRank);
    expect(game.xp).toBe(1);
  }
});

it("identifies a received item so the reader can show its notification without guessing from text", () => {
  const game = state();
  const pickup = GameActionSchema.parse({
    id: "pickup",
    label: "A letter arrives",
    kind: "give-item",
    reference: "sword",
  });
  performAction(hero(), game, definitions(), pickup, "option-0");
  expect(game.lastResult).toMatchObject({ message: "A letter arrives", itemId: "sword" });
  expect(GameStateSchema.parse(game).inventory).toEqual(["sword"]);
});
