import type { CharacterProfile } from "../../contracts/character.ts";
import type { GameDefinition, GameMove, GameState } from "../../contracts/game.ts";
import { awardXp, equipped, rank, stat } from "./character.ts";
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
  const { damage, die, effects } = attack(character, game, definition, move);
  combat.hp = Math.max(0, combat.hp - damage);
  game.lastResult = { success: damage > 0, roll: die, message: `${damage} damage dealt` };
  if (combat.hp === 0) return finish(character, game, "Victory", true, "victory");
  if (definition.rules.effectsBeforeRetaliation) combat.effects.push(...effects);
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
  combat.effects = combat.effects
    .map((effect) => ({ ...effect, turns: effect.turns - 1 }))
    .filter((effect) => effect.turns > 0);
  if (!definition.rules.effectsBeforeRetaliation) combat.effects.push(...effects);
  if (combat.effects.some((effect) => effect.kind === "charm"))
    return finish(character, game, "Charmed", true, "charmed");
  combat.turn++;
}
function attack(
  character: CharacterProfile,
  game: GameState,
  definition: GameDefinition,
  move: Exclude<GameMove, { kind: "flee" }>,
) {
  const combat = game.combat!;
  let damage: number, die: number;
  const effects: typeof combat.effects = [];
  if (move.kind === "ability") {
    const ability = definition.abilities.find(
      (ability) => ability.id === move.id && ability.offensive,
    );
    if (!ability) throw new Error("Choose a compatible offensive ability");
    die = roll(game, 6);
    damage =
      die >= 6 - rank(character, game, definition, ability.id)
        ? 7 + damageBonus(stat(character, game, definition, ability.attribute))
        : 0;
    if (
      damage &&
      ability.effect !== "none" &&
      !combat.effects.some((effect) => effect.ability === ability.id) &&
      roll(game, 3) === 1
    )
      effects.push({
        ability: ability.id,
        kind: ability.effect,
        turns: roll(game, 4) === 1 ? 3 : 1,
      });
  } else {
    const weapon = definition.items.find((item) => item.id === game.equipment.weapon);
    die = roll(game, 6);
    damage =
      die +
      damageBonus(stat(character, game, definition, weapon?.attribute ?? strongest(character)));
  }
  if (damage)
    damage += equipped(game, definition).reduce((sum, item) => sum + item.bonus.damage, 0);
  return { damage, die, effects };
}
function strongest(character: CharacterProfile) {
  return (["STR", "DEX", "WIL"] as const).reduce(
    (best, key) =>
      character.attributes[key].current > character.attributes[best].current ? key : best,
    "STR",
  );
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
  game.lastResult!.message += ` · ${damage} damage received`;
}
function flee(character: CharacterProfile, game: GameState, definition: GameDefinition) {
  const die = roll(game, 20),
    success = die <= stat(character, game, definition, definition.rules.fleeAttribute);
  game.lastResult = { success, roll: die, message: success ? "Escaped" : `Escape failed · ${die}` };
  if (success) return finish(character, game, "Escaped", false, "escaped");
  if (definition.rules.fleeFailureRetaliates) retaliate(character, game, definition);
  if (!character.health.current)
    return finish(character, game, "Defeat · narrative consequence", false, "defeat");
  game.combat!.effects = game
    .combat!.effects.map((effect) => ({ ...effect, turns: effect.turns - 1 }))
    .filter((effect) => effect.turns > 0);
  game.combat!.turn++;
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
