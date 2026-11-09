import type { CharacterProfile } from "../../contracts/character.ts";
import type { CheckOption, GameDefinition, GameState } from "../../contracts/game.ts";
import { rank, stat } from "./character.ts";

export function checkOptions(
  character: CharacterProfile,
  game: GameState,
  definition: GameDefinition,
) {
  if (game.pendingCheck?.origin) {
    character = game.pendingCheck.origin.character;
    game = { ...game, ...game.pendingCheck.origin };
  }
  const options: Record<string, CheckOption> = {};
  for (const action of definition.actions) {
    if (action.kind === "stat-check")
      options[action.id] = {
        attribute: action.attribute,
        sides: 20,
        threshold: stat(character, game, definition, action.attribute),
        comparison: "≤",
      };
    if (action.kind === "ability-check") {
      const ability = definition.abilities.find((ability) => ability.id === action.reference);
      if (ability && character.abilities.some((known) => known.id === ability.id))
        options[action.id] = {
          attribute: ability.attribute,
          sides: 6,
          threshold: 6 - rank(character, game, definition, ability.id),
          comparison: "≥",
        };
    }
  }
  return options;
}
