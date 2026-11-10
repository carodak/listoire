import { expect, it } from "vitest";
import { GameDefinitionSchema, GameStateSchema } from "../../contracts/game.ts";
import type { GameState } from "../../contracts/game.ts";
import { createCharacter } from "../character/create-character.ts";
import { combatTurn } from "./combat.ts";

const definition = GameDefinitionSchema.parse({
  abilities: [
    { id: "strike", attribute: "STR", offensive: true, effect: "stun" },
    { id: "insight", attribute: "WIL" },
  ],
  encounters: [{ id: "guard", name: "Guard", difficulty: "normal", profile: "balanced" }],
});
function fight(effects: NonNullable<GameState["combat"]>["effects"] = []) {
  const character = createCharacter(["strike", "insight"], () => 4);
  const game = GameStateSchema.parse({
    rng: 4812,
    xp: 0,
    baseMaxHp: 6,
    inventory: [],
    equipment: {},
  });
  game.combat = {
    encounterId: "guard",
    choiceId: "fight",
    hp: 200,
    maxHp: 200,
    damage: 2,
    turn: 1,
    effects,
  };
  return { character, game };
}

it("records damage dealt and received as numbers alongside the legacy message", () => {
  const { character, game } = fight();
  const enemyBefore = game.combat!.hp;
  const heroBefore = character.health.current;
  combatTurn(character, game, definition, { kind: "attack" });
  const result = game.lastResult!;
  expect(result.dealt).toBe(enemyBefore - game.combat!.hp);
  expect(result.received).toBe(heroBefore - character.health.current);
  expect(result.message).toBe(`${result.dealt} damage dealt · ${result.received} damage received`);
  expect(() => GameStateSchema.parse(game)).not.toThrow();
});

it("never stores more than two combat effects, so the state stays saveable", () => {
  let exercised = 0;
  for (let rng = 1; rng <= 300; rng++) {
    const { character, game } = fight([
      { ability: "blast", kind: "weaken", turns: 3 },
      { ability: "hex", kind: "weaken", turns: 3 },
    ]);
    game.rng = rng;
    combatTurn(character, game, definition, { kind: "ability", id: "strike" });
    const effects = game.combat?.effects ?? [];
    expect(effects.length).toBeLessThanOrEqual(2);
    expect(() => GameStateSchema.parse(game)).not.toThrow();
    // A third ability's stun displaced the oldest effect (it may then age out this turn).
    if (effects.length < 2 || effects.some((effect) => effect.kind === "stun")) exercised++;
  }
  expect(exercised).toBeGreaterThan(0);
});
