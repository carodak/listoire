import { CharacterSchema } from "../../contracts/character.ts";

export function createCharacter(abilityIds: string[], die: () => number) {
  const attribute = () => {
    const rolls = [die(), die(), die()];
    const initial = rolls.reduce((sum, roll) => sum + roll, 0);
    return { initial, current: initial, rolls };
  };
  return CharacterSchema.parse({
    health: { current: 6, max: 6 },
    attributes: { STR: attribute(), DEX: attribute(), WIL: attribute() },
    abilities: abilityIds.map((id) => ({ id, rank: 1 })),
  });
}
