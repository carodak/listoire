import type { Frame } from "./story.ts";
import type { CharacterProfile } from "./character.ts";
import type { GameDefinition, GameState } from "./game.ts";

export function validateGameState(
  game: GameState,
  character: CharacterProfile,
  definition: GameDefinition,
  frame?: Frame,
) {
  validateStoryResolution(game, definition, frame);
  validatePendingCheck(game, definition, frame);
  const abilities = new Map(definition.abilities.map((ability) => [ability.id, ability]));
  if (
    new Set(character.abilities.map((ability) => ability.id)).size !== character.abilities.length ||
    character.abilities.some((ability) => !abilities.has(ability.id))
  )
    throw new Error("Unknown or repeated character ability");
  const items = new Map(definition.items.map((item) => [item.id, item]));
  if (
    new Set(game.inventory).size !== game.inventory.length ||
    game.inventory.some((id) => !items.has(id))
  )
    throw new Error("Unknown or repeated inventory item");
  const equipped = Object.entries(game.equipment).filter((entry): entry is [string, string] =>
    Boolean(entry[1]),
  );
  if (equipped.some(([slot, id]) => !game.inventory.includes(id) || items.get(id)?.slot !== slot))
    throw new Error("Invalid equipped item");
  const bonus = equipped.reduce((sum, [, id]) => sum + items.get(id)!.bonus.HP, 0);
  if (character.health.max !== game.baseMaxHp + bonus)
    throw new Error("Character HP disagrees with equipment");
  const combat = game.combat;
  if (!combat) return;
  if (
    !definition.encounters.some((encounter) => encounter.id === combat.encounterId) ||
    combat.hp > combat.maxHp ||
    character.health.current === 0
  )
    throw new Error("Invalid active encounter");
  if (frame) {
    const choice = frame.choices
      .concat(frame.actions ?? [])
      .find((choice) => choice.id === combat.choiceId);
    const action = definition.actions.find((action) => action.id === choice?.gameAction);
    if (action?.kind !== "combat" || action.reference !== combat.encounterId)
      throw new Error("Encounter has no matching story choice");
  }
  if (combat.effects.some((effect) => abilities.get(effect.ability)?.effect !== effect.kind))
    throw new Error("Invalid combat ability effect");
}

function validatePendingCheck(game: GameState, definition: GameDefinition, frame?: Frame) {
  if (game.pendingCheck) {
    const pending = game.pendingCheck;
    if (pending.origin) {
      const { character, ...origin } = pending.origin;
      validateGameState(
        { ...game, ...origin, pendingCheck: undefined },
        character,
        definition,
        frame,
      );
    }
    const action = definition.actions.find((item) => item.id === pending.actionId);
    if (
      game.combat ||
      !action ||
      !["stat-check", "ability-check"].includes(action.kind) ||
      !(
        frame &&
        [...frame.choices, ...(frame.actions ?? [])].some(
          (choice) => choice.id === pending.choiceId && choice.gameAction === action.id,
        )
      ) ||
      (pending.rolled && !game.lastResult?.dice?.length)
    )
      throw new Error("Invalid pending check");
  }
}

function validateStoryResolution(game: GameState, definition: GameDefinition, frame?: Frame) {
  if (
    game.lastResult?.abilityUsed &&
    !definition.abilities.some((ability) => ability.id === game.lastResult!.abilityUsed)
  )
    throw new Error("Unknown ability used in result");
  if (!game.pendingEvent) return;
  const choice = [...(frame?.choices ?? []), ...(frame?.actions ?? [])].find(
    (choice) => choice.id === game.pendingEvent!.choiceId,
  );
  const action = definition.actions.find((action) => action.id === choice?.gameAction);
  if (
    game.pendingCheck ||
    game.combat ||
    !game.lastResult ||
    !action ||
    ["stat-check", "ability-check"].includes(action.kind) ||
    (action.kind === "combat" && !game.lastResult.outcome)
  )
    throw new Error("Invalid pending story event");
}
