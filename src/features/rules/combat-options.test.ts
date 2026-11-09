import { expect, it } from "vitest";
import { GameDefinitionSchema, GameStateSchema } from "../../contracts/game.ts";
import { createCharacter } from "../character/create-character.ts";
import { combatOptions } from "./combat-options.ts";
import { combatTurn } from "./combat.ts";

it("derives available combat abilities and odds without advancing RNG", () => {
  const definition = GameDefinitionSchema.parse({
    abilities: [
      { id: "blast", offensive: true, attribute: "WIL" },
      { id: "light", attribute: "WIL" },
      { id: "unknown", offensive: true, attribute: "STR" },
    ],
  });
  const character = createCharacter(["blast", "light"], () => 4);
  const game = GameStateSchema.parse({
    rng: 35,
    xp: 0,
    baseMaxHp: 6,
    inventory: [],
    equipment: {},
    combat: {
      encounterId: "test",
      choiceId: "test",
      hp: 5,
      maxHp: 5,
      damage: 1,
      turn: 1,
      effects: [],
    },
  });
  const before = structuredClone({ character, game });
  const options = combatOptions(character, game, definition);
  expect(options).toMatchObject([
    { move: { kind: "attack" }, probability: 1, damage: { base: 0, bonus: 1, equipment: 0 } },
    {
      move: { kind: "ability", id: "blast" },
      probability: 2 / 6,
      check: { attribute: "WIL", sides: 6, threshold: 5, comparison: "≥" },
      damage: { base: 7, bonus: 1, equipment: 0 },
    },
    {
      move: { kind: "flee" },
      probability: 12 / 20,
      check: { attribute: "DEX", sides: 20, threshold: 12, comparison: "≤" },
    },
  ]);
  expect(options[0]!.attackTable).toEqual(
    [1, 2, 3, 4, 5, 6].map((die) => ({ die, damage: die + 1 })),
  );
  const ability = options.find((option) => option.move.kind === "ability")!;
  for (const row of ability.ranks!) {
    const hero = structuredClone(character);
    hero.abilities[0]!.rank = row.rank;
    const trial = structuredClone(game);
    trial.combat!.hp = trial.combat!.maxHp = 50;
    combatTurn(hero, trial, definition, { kind: "ability", id: "blast" });
    const success = trial.lastResult!.roll >= row.threshold;
    expect(50 - trial.combat!.hp).toBe(success ? row.damage : 0);
    expect(row.probability).toBe((7 - row.threshold) / 6);
  }
  expect({ character, game }).toEqual(before);
});
