import { expect, it } from "vitest";
import { damageBonus, enemyProfile } from "./enemy.ts";
import {
  rulesDefinitions as definitions,
  rulesHero as hero,
  rulesState as state,
} from "../../test-fixtures.ts";

it("retains the approved enemy formula and corrects its example to 15 HP", () => {
  const character = hero(),
    game = state();
  character.health = { current: 14, max: 14 };
  game.baseMaxHp = 14;
  character.attributes.STR.current = 16;
  expect(enemyProfile(character, game, definitions(), "guard")).toEqual({
    hp: 15,
    damage: 3,
    referenceHp: 11,
    referenceStat: 14,
    turns: 3,
  });
  expect([3, 9, 10, 13, 14, 17, 18].map(damageBonus)).toEqual([0, 0, 1, 1, 2, 2, 3]);
});
