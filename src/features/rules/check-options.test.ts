import { expect, it } from "vitest";
import { GameDefinitionSchema, GameStateSchema } from "../../contracts/game.ts";
import { createCharacter } from "../character/create-character.ts";
import { checkOptions } from "./check-options.ts";

it("describes the actual ability rank and capped attribute without rolling", () => {
  const character = createCharacter(["air", "insight"], () => 4);
  const game = GameStateSchema.parse({
    rng: 4812,
    xp: 0,
    baseMaxHp: 6,
    inventory: [],
    equipment: {},
  });
  const definition = GameDefinitionSchema.parse({
    abilities: [
      { id: "air", attribute: "DEX" },
      { id: "unknown", attribute: "WIL" },
    ],
    actions: [
      { id: "apple", label: "Lift apple", kind: "ability-check", reference: "air" },
      { id: "look", label: "Look", kind: "stat-check", attribute: "WIL" },
    ],
  });
  const before = structuredClone({ game, character });
  expect(checkOptions(character, game, definition)).toEqual({
    apple: { attribute: "DEX", sides: 6, threshold: 5, comparison: "≥" },
    look: { attribute: "WIL", sides: 20, threshold: 12, comparison: "≤" },
  });
  expect({ game, character }).toEqual(before);
});
