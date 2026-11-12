import { expect, it } from "vitest";
import { GameStateSchema } from "../../contracts/game.ts";
import { roll } from "./random.ts";
import { rulesState as state } from "../../test-fixtures.ts";

it.each([6, 20])(
  "keeps all d%i faces equally distributed across a deterministic long run",
  (sides) => {
    const game = state();
    const counts = Array.from({ length: sides }, () => 0);
    const expected = 100000;
    for (let index = 0; index < expected * sides; index++) counts[roll(game, sides) - 1]!++;
    for (const count of counts) expect(Math.abs(count - expected)).toBeLessThan(expected * 0.015);
    expect(counts.every((count) => count > 0)).toBe(true);
  },
);

it("rolls the same dice again from the same checkpoint", () => {
  const first = state(),
    copy = structuredClone(first);
  expect(Array.from({ length: 100 }, () => roll(first, 6))).toEqual(
    Array.from({ length: 100 }, () => roll(copy, 6)),
  );
});

it("records actual dice without consuming additional random numbers and validates saved faces", () => {
  const game = state(),
    copy = structuredClone(game);
  const dice: NonNullable<NonNullable<typeof game.lastResult>["dice"]> = [];
  for (const sides of [6, 3, 4, 20]) expect(roll(game, sides, dice)).toBe(roll(copy, sides));
  expect(game.rng).toBe(copy.rng);
  expect(dice.map((die) => die.sides)).toEqual([6, 3, 4, 20]);
  game.lastResult = { success: true, roll: dice[0]!.value, dice, message: "fixture" };
  expect(GameStateSchema.parse(JSON.parse(JSON.stringify(game)))).toEqual(game);
  dice[0]!.value = 7;
  expect(GameStateSchema.safeParse(game).success).toBe(false);
});
