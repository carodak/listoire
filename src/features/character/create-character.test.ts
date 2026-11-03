import { expect, it } from "vitest";
import { createCharacter } from "./create-character.ts";
it("keeps all 3d6 rolls and initial attributes with full starting health and rank-one abilities", () => {
  const rolls = [1, 2, 3, 4, 5, 6, 6, 6, 6];
  const profile = createCharacter(["close-reading", "composure"], () => rolls.shift()!);
  expect(profile.health).toEqual({ current: 6, max: 6 });
  expect(profile.attributes.STR).toEqual({ initial: 6, current: 6, rolls: [1, 2, 3] });
  expect(profile.attributes.DEX.current).toBe(15);
  expect(profile.attributes.WIL.current).toBe(18);
  expect(profile.abilities.every((ability) => ability.rank === 1)).toBe(true);
});
it("rejects impossible dice rather than silently clamping them", () => {
  expect(() => createCharacter(["composure"], () => 7)).toThrow();
});
