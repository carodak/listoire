import type { CharacterProfile } from "../../contracts/character.ts";
import type { GameDefinition, GameMove, GameState } from "../../contracts/game.ts";
import { awardXp, equipped, rank, stat, attackAttribute } from "./character.ts";
import { damageBonus } from "./enemy.ts";
import { roll } from "./random.ts";

export function combatTurn(
  character: CharacterProfile,
  game: GameState,
  definition: GameDefinition,
  move: GameMove,
) {
  const combat = game.combat;
  if (!combat || character.health.current === 0) throw new Error("No active encounter");
  if (move.kind === "flee") return flee(character, game, definition);
  if (move.kind === "item") return useItem(character, game, definition, move.id);
  const { damage, die, effects, dice } = attack(character, game, definition, move);
  combat.hp = Math.max(0, combat.hp - damage);
  game.lastResult = {
    success: damage > 0,
    roll: die,
    dice,
    dealt: damage,
    message: `${damage} damage dealt`,
  };
  if (move.kind === "ability") game.lastResult.abilityUsed = move.id;
  if (combat.hp === 0) return finish(character, game, "Victory", true, "victory");
  if (definition.rules.effectsBeforeRetaliation) addEffects(combat, effects);
  if (combat.effects.some((effect) => effect.kind === "charm"))
    return finish(character, game, "Charmed · narrative resolution", true, "charmed");
  retaliate(character, game, definition);
  if (character.health.current === 0)
    return finish(
      character,
      game,
      "Defeat · continue to the authored consequence",
      false,
      "defeat",
    );
  ageEffects(combat);
  if (!definition.rules.effectsBeforeRetaliation) addEffects(combat, effects);
  if (combat.effects.some((effect) => effect.kind === "charm"))
    return finish(character, game, "Charmed", true, "charmed");
  combat.turn++;
}
function attack(
  character: CharacterProfile,
  game: GameState,
  definition: GameDefinition,
  move: { kind: "attack" } | { kind: "ability"; id: string },
) {
  const combat = game.combat!;
  let damage: number, die: number;
  const effects: typeof combat.effects = [];
  const dice: NonNullable<NonNullable<GameState["lastResult"]>["dice"]> = [];
  if (move.kind === "ability") {
    const ability = definition.abilities.find(
      (ability) => ability.id === move.id && ability.offensive,
    );
    if (!ability) throw new Error("Choose a compatible offensive ability");
    die = roll(game, 6, dice);
    damage =
      die >= 6 - rank(character, game, definition, ability.id)
        ? 7 + damageBonus(stat(character, game, definition, ability.attribute))
        : 0;
    if (
      damage &&
      ability.effect !== "none" &&
      !combat.effects.some((effect) => effect.ability === ability.id) &&
      roll(game, 3, dice) === 1
    )
      effects.push({
        ability: ability.id,
        kind: ability.effect,
        turns: roll(game, 4, dice) === 1 ? 3 : 1,
      });
  } else {
    die = roll(game, 6, dice);
    damage =
      die +
      damageBonus(stat(character, game, definition, attackAttribute(character, game, definition)));
  }
  if (damage)
    damage += equipped(game, definition).reduce((sum, item) => sum + item.bonus.damage, 0);
  return { damage, die, effects, dice };
}
function useItem(
  character: CharacterProfile,
  game: GameState,
  definition: GameDefinition,
  id: string,
) {
  const item = definition.items.find(
    (item) => item.id === id && item.consumable && item.healing > 0,
  );
  if (!item || !game.inventory.includes(id) || Object.values(game.equipment).includes(id))
    throw new Error("Choose an available consumable");
  const previous = character.health.current;
  character.health.current = Math.min(character.health.max, previous + item.healing);
  game.inventory = game.inventory.filter((owned) => owned !== id);
  game.lastResult = {
    success: true,
    roll: 0,
    usedItem: id,
    healed: character.health.current - previous,
    message: `${item.name}: +${character.health.current - previous} HP`,
  };
  retaliate(character, game, definition);
  if (!character.health.current) return finish(character, game, "Defeat", false, "defeat");
  ageEffects(game.combat!);
  game.combat!.turn++;
}
function retaliate(character: CharacterProfile, game: GameState, definition: GameDefinition) {
  const combat = game.combat!;
  const stunned =
    definition.rules.stunCancelsRetaliation &&
    combat.effects.some((effect) => effect.kind === "stun");
  const reduction = combat.effects.some((effect) => effect.kind === "weaken")
    ? definition.rules.weakeningDamageReduction
    : 0;
  const damage = stunned ? 0 : Math.max(0, combat.damage - reduction);
  character.health.current = Math.max(0, character.health.current - damage);
  game.lastResult!.received = damage;
  game.lastResult!.message += ` · ${damage} damage received`;
}
/** The saved state holds at most two effects; a new one replaces the oldest. */
function addEffects(
  combat: NonNullable<GameState["combat"]>,
  effects: NonNullable<GameState["combat"]>["effects"],
) {
  combat.effects = [...combat.effects, ...effects].slice(-2);
}
function flee(character: CharacterProfile, game: GameState, definition: GameDefinition) {
  const die = roll(game, 20),
    success = die <= stat(character, game, definition, definition.rules.fleeAttribute);
  game.lastResult = {
    success,
    roll: die,
    dice: [{ sides: 20, value: die }],
    fled: success,
    message: success ? "Escaped" : `Escape failed · ${die}`,
  };
  if (success) return finish(character, game, "Escaped", false, "escaped");
  if (definition.rules.fleeFailureRetaliates) retaliate(character, game, definition);
  if (!character.health.current)
    return finish(character, game, "Defeat · narrative consequence", false, "defeat");
  ageEffects(game.combat!);
  game.combat!.turn++;
}
function ageEffects(combat: NonNullable<GameState["combat"]>) {
  combat.effects = combat.effects
    .map((effect) => ({ ...effect, turns: effect.turns - 1 }))
    .filter((effect) => effect.turns > 0);
}
function finish(
  character: CharacterProfile,
  game: GameState,
  message: string,
  success: boolean,
  outcome: NonNullable<GameState["lastResult"]>["outcome"],
) {
  const choice = game.combat!.choiceId;
  delete game.combat;
  game.lastResult = { ...game.lastResult!, success, message, outcome };
  awardXp(character, game, 1);
  return choice;
}
