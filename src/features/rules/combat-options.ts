import type { CharacterProfile } from "../../contracts/character.ts";
import type { CombatOption, GameDefinition, GameState } from "../../contracts/game.ts";
import { rank, stat, equipped, attackAttribute } from "./character.ts";
import { damageBonus } from "./enemy.ts";

export function combatOptions(
  character: CharacterProfile,
  game: GameState,
  definition: GameDefinition,
): CombatOption[] {
  if (!game.combat || !character.health.current) return [];
  const attribute = attackAttribute(character, game, definition);
  const equipment = equipped(game, definition).reduce((sum, item) => sum + item.bonus.damage, 0);
  const score = stat(character, game, definition, attribute);
  const bonus = damageBonus(score);
  return [
    {
      move: { kind: "attack" },
      probability: 1,
      damage: {
        base: 0,
        bonus,
        equipment,
        attribute,
        score,
      },
      attackTable: Array.from({ length: 6 }, (_, index) => ({
        die: index + 1,
        damage: index + 1 + bonus + equipment,
      })),
    },
    ...definition.abilities
      .filter(
        (ability) =>
          ability.offensive && character.abilities.some((known) => known.id === ability.id),
      )
      .map((ability) => abilityOption(character, game, definition, ability, equipment)),
    ...definition.items
      .filter(
        (item) =>
          item.consumable &&
          item.healing > 0 &&
          game.inventory.includes(item.id) &&
          !Object.values(game.equipment).includes(item.id),
      )
      .map((item): CombatOption => ({
        move: { kind: "item", id: item.id },
        probability: 1,
        healing: item.healing,
      })),
    {
      move: { kind: "flee" },
      probability: stat(character, game, definition, definition.rules.fleeAttribute) / 20,
      check: {
        attribute: definition.rules.fleeAttribute,
        sides: 20,
        threshold: stat(character, game, definition, definition.rules.fleeAttribute),
        comparison: "≤",
      },
    },
  ];
}

function abilityOption(
  character: CharacterProfile,
  game: GameState,
  definition: GameDefinition,
  ability: GameDefinition["abilities"][number],
  equipment: number,
): CombatOption {
  const currentRank = rank(character, game, definition, ability.id);
  const score = stat(character, game, definition, ability.attribute);
  const bonus = damageBonus(score);
  return {
    move: { kind: "ability", id: ability.id },
    probability: (1 + currentRank) / 6,
    check: { attribute: ability.attribute, sides: 6, threshold: 6 - currentRank, comparison: "≥" },
    rank: currentRank,
    damage: { base: 7, bonus, equipment, attribute: ability.attribute, score },
    ranks: Array.from({ length: 4 }, (_, index) => ({
      rank: index + 1,
      threshold: 5 - index,
      damage: 7 + bonus + equipment,
      probability: (index + 2) / 6,
    })),
  };
}
