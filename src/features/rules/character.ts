import type { CharacterProfile, AttributeDetails } from "../../contracts/character.ts";
import { attributes } from "../../contracts/game.ts";
import type { GameDefinition, GameState } from "../../contracts/game.ts";
import { roll } from "./random.ts";

export function equipped(game: GameState, definition: GameDefinition) {
  return definition.items.filter((item) => Object.values(game.equipment).includes(item.id));
}
export function attackAttribute(
  character: CharacterProfile,
  game: GameState,
  definition: GameDefinition,
) {
  return (
    definition.items.find((item) => item.id === game.equipment.weapon)?.attribute ??
    attributes.reduce(
      (best, key) =>
        character.attributes[key].current > character.attributes[best].current ? key : best,
      "STR",
    )
  );
}
export function stat(
  character: CharacterProfile,
  game: GameState,
  definition: GameDefinition,
  attribute: (typeof attributes)[number],
) {
  return Math.min(
    18,
    character.attributes[attribute].current +
      equipped(game, definition).reduce((sum, item) => sum + item.bonus[attribute], 0),
  );
}
export function rank(
  character: CharacterProfile,
  game: GameState,
  definition: GameDefinition,
  id: string,
) {
  const ability = character.abilities.find((ability) => ability.id === id);
  if (!ability) throw new Error("Unknown character ability");
  return Math.min(
    4,
    ability.rank + equipped(game, definition).filter((item) => item.ability === id).length,
  );
}
export function equip(
  character: CharacterProfile,
  game: GameState,
  definition: GameDefinition,
  id: string,
  remove = false,
) {
  if (game.combat) throw new Error("Equipment cannot change during combat");
  const item = definition.items.find((item) => item.id === id);
  if (!item || item.slot === "none" || !game.inventory.includes(id))
    throw new Error("This item cannot be equipped");
  if (remove && game.equipment[item.slot] !== id) throw new Error("This item is not equipped");
  const previous = character.health.max;
  if (remove) delete game.equipment[item.slot];
  else game.equipment[item.slot] = id;
  character.health.max =
    game.baseMaxHp + equipped(game, definition).reduce((sum, item) => sum + item.bonus.HP, 0);
  const heal = definition.rules.hpBonusHeals ? Math.max(0, character.health.max - previous) : 0;
  character.health.current = Math.min(character.health.max, character.health.current + heal);
}
export function awardXp(character: CharacterProfile, game: GameState, amount: number) {
  const total = game.xp + amount;
  if (amount < 0) throw new Error("XP awards must be nonnegative");
  for (let points = total; points >= 5; points -= 5) {
    game.baseMaxHp++;
    character.health.max++;
    const attribute = attributes[roll(game, 3) - 1]!;
    character.attributes[attribute].current = Math.min(
      18,
      character.attributes[attribute].current + 1,
    );
    character.health.current = Math.min(
      character.health.max,
      character.health.current + 1 + Math.ceil(character.health.max * 0.25),
    );
  }
  game.xp = total % 5;
}

type Attribute = "STR" | "DEX" | "WIL";

/** Display the same capped value as game checks, with an honest uncapped equipment breakdown. */
export function attributeBreakdown(
  profile: CharacterProfile,
  game: GameState | null | undefined,
  definition: GameDefinition | null | undefined,
  attribute: Attribute,
) {
  const base = profile.attributes[attribute].current;
  if (!game || !definition) return { base, equipment: 0, total: base, capped: false };
  const equipment = equipped(game, definition).reduce(
    (sum, item) => sum + item.bonus[attribute],
    0,
  );
  const total = stat(profile, game, definition, attribute);
  return { base, equipment, total, capped: total < base + equipment };
}

export function characterAttributes(
  profile: CharacterProfile,
  game?: GameState | null,
  definition?: GameDefinition,
): AttributeDetails {
  return {
    STR: attributeBreakdown(profile, game, definition, "STR"),
    DEX: attributeBreakdown(profile, game, definition, "DEX"),
    WIL: attributeBreakdown(profile, game, definition, "WIL"),
  };
}
