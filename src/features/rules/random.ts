import type { GameState } from "../../contracts/game.ts";

export function roll(
  state: GameState,
  sides: number,
  dice?: NonNullable<GameState["lastResult"]>["dice"],
): number {
  // Rejection sampling avoids modulo bias; the advanced state is checkpointed with the action.
  const limit = Math.floor(4294967295 / sides) * sides;
  let value: number;
  do {
    value = state.rng;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    state.rng = value >>> 0;
  } while (state.rng > limit);
  const result = ((state.rng - 1) % sides) + 1;
  if (dice && (sides === 3 || sides === 4 || sides === 6 || sides === 20))
    dice.push({ sides, value: result });
  return result;
}
