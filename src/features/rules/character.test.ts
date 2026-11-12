import { expect, it } from "vitest";
import { CharacterSchema } from "../../contracts/character.ts";
import { GameDefinitionSchema, GameStateSchema } from "../../contracts/game.ts";
import { attributeBreakdown, awardXp, equip, rank } from "./character.ts";
import { enemyProfile } from "./enemy.ts";
import {
  rulesDefinitions as definitions,
  rulesHero as hero,
  rulesState as state,
} from "../../test-fixtures.ts";

it("equips one item per slot without free HP and excludes gear from enemy calibration", () => {
  const character = hero(),
    game = state(),
    definition = definitions();
  game.inventory = ["sword"];
  const before = enemyProfile(character, game, definition, "guard");
  equip(character, game, definition, "sword");
  expect(character.health).toEqual({ current: 6, max: 8 });
  expect(rank(character, game, definition, "strike")).toBe(2);
  expect(enemyProfile(character, game, definition, "guard")).toEqual(before);
  character.health.current = 8;
  equip(character, game, definition, "sword", true);
  expect(character.health).toEqual({ current: 6, max: 6 });
});

it("levels at 5 XP with the specified HP sequence and capped attributes", () => {
  const character = hero(),
    game = state();
  character.health.current = 3;
  game.xp = 4;
  awardXp(character, game, 1);
  expect(character.health).toEqual({ current: 6, max: 7 });
  expect(game.baseMaxHp).toBe(7);
  expect(game.xp).toBe(0);
  Object.values(character.attributes).forEach((attribute) => {
    attribute.current = 18;
  });
  awardXp(character, game, 10);
  expect(Object.values(character.attributes).every((attribute) => attribute.current === 18)).toBe(
    true,
  );
});

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
