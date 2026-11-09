import { expect, it } from "vitest";
import { CharacterSchema } from "../../contracts/character.ts";
import { GameDefinitionSchema, GameStateSchema } from "../../contracts/game.ts";
import { attributeBreakdown } from "./character.ts";

it("shows base, equipped bonus and the effective capped stat used by game checks", () => {
  const character = CharacterSchema.parse({
    health: { current: 6, max: 6 },
    attributes: {
      STR: { initial: 12, current: 12, rolls: [4, 4, 4] },
      DEX: { initial: 15, current: 17, rolls: [5, 5, 5] },
      WIL: { initial: 9, current: 9, rolls: [3, 3, 3] },
    },
    abilities: [{ id: "focus", rank: 1 }],
  });
  const definition = GameDefinitionSchema.parse({
    items: [{ id: "boots", name: "Boots", slot: "accessory", bonus: { DEX: 3 } }],
  });
  const game = GameStateSchema.parse({
    rng: 2,
    xp: 3,
    baseMaxHp: 6,
    inventory: ["boots"],
    equipment: { accessory: "boots" },
  });
  expect(attributeBreakdown(character, game, definition, "DEX")).toEqual({
    base: 17,
    equipment: 3,
    total: 18,
    capped: true,
  });
  expect(attributeBreakdown(character, game, definition, "STR")).toEqual({
    base: 12,
    equipment: 0,
    total: 12,
    capped: false,
  });
  expect(attributeBreakdown(character, null, definition, "DEX")).toMatchObject({
    base: 17,
    equipment: 0,
    total: 17,
  });
});
