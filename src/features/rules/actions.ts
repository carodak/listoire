import type { CharacterProfile } from "../../contracts/character.ts";
import type { GameAction, GameDefinition, GameState } from "../../contracts/game.ts";
import { awardXp, equip, rank, stat } from "./character.ts";
import { enemyProfile } from "./enemy.ts";
import { roll } from "./random.ts";

export function performAction(
  character: CharacterProfile,
  game: GameState,
  definition: GameDefinition,
  action: GameAction,
  choiceId: string,
) {
  if (game.combat) throw new Error("Resolve the encounter first");
  if (character.health.current === 0 && !["heal", "remove-item"].includes(action.kind))
    throw new Error("Resolve the narrative defeat before further actions");
  game.lastResult = { success: true, roll: 0, message: action.label };
  switch (action.kind) {
    case "stat-check":
      return check(
        character,
        game,
        action,
        20,
        stat(character, game, definition, action.attribute),
      );
    case "ability-check":
      return check(
        character,
        game,
        action,
        6,
        6 - rank(character, game, definition, action.reference),
      );
    case "combat": {
      const enemy = enemyProfile(character, game, definition, action.reference);
      game.combat = {
        encounterId: action.reference,
        choiceId,
        hp: enemy.hp,
        maxHp: enemy.hp,
        damage: enemy.damage,
        turn: 1,
        effects: [],
      };
      return;
    }
    case "give-item":
      game.inventory = [...new Set([...game.inventory, action.reference])];
      game.lastResult.itemId = action.reference;
      return;
    case "remove-item": {
      const item = definition.items.find((item) => item.id === action.reference);
      if (item && Object.values(game.equipment).includes(item.id))
        equip(character, game, definition, item.id, true);
      game.inventory = game.inventory.filter((id) => id !== action.reference);
      return;
    }
    case "heal":
      character.health.current = Math.max(
        0,
        Math.min(character.health.max, character.health.current + action.amount),
      );
      return;
    case "xp":
      awardXp(character, game, action.amount);
      return;
    case "train": {
      const ability = character.abilities.find((ability) => ability.id === action.reference);
      if (!ability) throw new Error("Unknown ability");
      ability.rank = Math.max(1, Math.min(4, ability.rank + action.amount));
      return;
    }
    case "learn": {
      if (!definition.abilities.some((ability) => ability.id === action.reference))
        throw new Error("Unknown ability");
      if (character.abilities.some((ability) => ability.id === action.reference)) return;
      if (character.abilities.length >= 32) throw new Error("Ability limit reached");
      character.abilities.push({ id: action.reference, rank: 1 });
      game.lastResult.abilityId = action.reference;
    }
  }
}
function check(
  character: CharacterProfile,
  game: GameState,
  action: GameAction,
  sides: number,
  threshold: number,
) {
  const die = roll(game, sides);
  const success = sides === 20 ? die <= threshold : die >= threshold;
  game.lastResult = {
    success,
    roll: die,
    dice: [{ sides: sides === 20 ? 20 : 6, value: die }],
    ...(action.kind === "ability-check" ? { abilityUsed: action.reference } : {}),
    message: `${action.label}: ${die} ${sides === 20 ? "≤" : "≥"} ${threshold} · ${success ? "Success" : "Failure"}`,
  };
  awardXp(character, game, 1);
}
