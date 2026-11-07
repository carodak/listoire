import type { Frame } from "./story.ts";
import type { CharacterProfile } from "./character.ts";
import type { GameDefinition, GameState } from "./game.ts";

export function validateGameState(
  game: GameState,
  character: CharacterProfile,
  definition: GameDefinition,
  frame?: Frame,
) {
  if (
    new Set(character.abilities.map((ability) => ability.id)).size !== character.abilities.length ||
    character.abilities.some(
      (ability) => !definition.abilities.some((item) => item.id === ability.id),
    )
  )
    throw new Error("Unknown or repeated character ability");
  const items = new Map(definition.items.map((item) => [item.id, item]));
  if (
    new Set(game.inventory).size !== game.inventory.length ||
    game.inventory.some((id) => !items.has(id))
  )
    throw new Error("Unknown or repeated inventory item");
  for (const slot of ["weapon", "accessory"] as const) {
    const id = game.equipment[slot];
    if (id && (!game.inventory.includes(id) || items.get(id)?.slot !== slot))
      throw new Error("Invalid equipped item");
  }
  const bonus = Object.values(game.equipment).reduce(
    (sum, id) => sum + (items.get(id)?.bonus.HP ?? 0),
    0,
  );
  if (character.health.max !== game.baseMaxHp + bonus)
    throw new Error("Character HP disagrees with equipment");
  if (
    game.combat &&
    (!definition.encounters.some((encounter) => encounter.id === game.combat!.encounterId) ||
      game.combat.hp > game.combat.maxHp ||
      character.health.current === 0)
  )
    throw new Error("Invalid active encounter");
  if (
    game.combat &&
    frame &&
    ![...frame.choices, ...(frame.actions ?? [])].some(
      (choice) =>
        choice.id === game.combat!.choiceId &&
        definition.actions.some(
          (action) =>
            action.id === choice.gameAction &&
            action.kind === "combat" &&
            action.reference === game.combat!.encounterId,
        ),
    )
  )
    throw new Error("Encounter has no matching story choice");
  if (
    game.combat?.effects.some(
      (effect) =>
        !definition.abilities.some(
          (ability) => ability.id === effect.ability && ability.effect === effect.kind,
        ),
    )
  )
    throw new Error("Invalid combat ability effect");
}
