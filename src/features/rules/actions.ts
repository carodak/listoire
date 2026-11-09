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
    case "combat":
      return startCombat(character, game, definition, action.reference, choiceId);
    case "give-item":
      game.inventory = [...new Set([...game.inventory, action.reference])];
      game.lastResult.itemId = action.reference;
      return;
    case "remove-item":
      return removeItem(character, game, definition, action.reference);
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
    case "learn":
      return learn(character, game, definition, action.reference);
  }
}
function startCombat(
  character: CharacterProfile,
  game: GameState,
  definition: GameDefinition,
  encounterId: string,
  choiceId: string,
) {
  const { hp, damage } = enemyProfile(character, game, definition, encounterId);
  game.combat = { encounterId, choiceId, hp, maxHp: hp, damage, turn: 1, effects: [] };
}
function removeItem(
  character: CharacterProfile,
  game: GameState,
  definition: GameDefinition,
  id: string,
) {
  const item = definition.items.find((item) => item.id === id);
  if (item && Object.values(game.equipment).includes(item.id))
    equip(character, game, definition, item.id, true);
  game.inventory = game.inventory.filter((entry) => entry !== id);
}
function learn(
  character: CharacterProfile,
  game: GameState,
  definition: GameDefinition,
  id: string,
) {
  if (!definition.abilities.some((ability) => ability.id === id))
    throw new Error("Unknown ability");
  if (character.abilities.some((ability) => ability.id === id)) return;
  if (character.abilities.length >= 32) throw new Error("Ability limit reached");
  character.abilities.push({ id, rank: 1 });
  game.lastResult!.abilityId = id;
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
