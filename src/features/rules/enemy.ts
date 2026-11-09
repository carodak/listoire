import type { CharacterProfile } from "../../contracts/character.ts";
import type { GameDefinition, GameState } from "../../contracts/game.ts";
import { attackAttribute } from "./character.ts";

export function damageBonus(score: number) {
  return score >= 18 ? 3 : score >= 14 ? 2 : score >= 10 ? 1 : 0;
}
export function enemyProfile(
  character: CharacterProfile,
  game: GameState,
  definition: GameDefinition,
  id: string,
) {
  const encounter = definition.encounters.find((item) => item.id === id);
  if (!encounter) throw new Error("Unknown encounter");
  const [scale, target] = {
    easy: [0.4, 0.9],
    normal: [0.6, 0.75],
    hard: [0.75, 0.6],
    boss: [0.9, 0.5],
  }[encounter.difficulty] as [number, number];
  const attribute = attackAttribute(character, game, definition);
  const score = character.attributes[attribute];
  const referenceHp = Math.round(6 + (game.baseMaxHp - 6) * scale);
  const referenceStat = Math.round(score.initial + (score.current - score.initial) * scale);
  const damage = Math.max(
    1,
    Math.ceil(
      referenceHp * { resilient: 0.17, balanced: 0.25, offensive: 0.34 }[encounter.profile],
    ),
  );
  const turns = Math.ceil(Math.ceil(0.8 * referenceHp) / damage);
  const distribution = attackDistribution(turns, damageBonus(referenceStat));
  let probability = 1,
    hp = 1,
    error = Infinity;
  for (let candidate = 1; candidate <= distribution.length; candidate++) {
    probability -= distribution[candidate - 1] ?? 0;
    const difference = Math.abs(probability - target);
    if (difference < error - 1e-12) {
      hp = candidate;
      error = difference;
    }
  }
  return { hp, damage, referenceHp, referenceStat, turns };
}
function attackDistribution(turns: number, bonus: number) {
  let probabilities = [1];
  for (let turn = 0; turn < turns; turn++) {
    const next = Array<number>(probabilities.length + 6 + bonus).fill(0);
    probabilities.forEach((probability, sum) => {
      for (let die = 1; die <= 6; die++) next[sum + die + bonus]! += probability / 6;
    });
    probabilities = next;
  }
  return probabilities;
}
