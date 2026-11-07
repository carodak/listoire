import type { GameState } from "../../contracts/game.ts";

export function roll(state: GameState, sides: number): number {
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
  return ((state.rng - 1) % sides) + 1;
}
