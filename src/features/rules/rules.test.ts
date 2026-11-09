import { expect, it } from "vitest";
import { GameActionSchema, GameDefinitionSchema, GameStateSchema } from "../../contracts/game.ts";
import { createCharacter } from "../character/create-character.ts";
import { damageBonus, enemyProfile } from "./enemy.ts";
import { awardXp, equip, rank } from "./character.ts";
import { performAction } from "./actions.ts";
import { combatTurn } from "./combat.ts";
import { roll } from "./random.ts";

function hero() {
  return createCharacter(["strike", "insight"], () => 4);
}
function state() {
  return GameStateSchema.parse({ rng: 4812, xp: 0, baseMaxHp: 6, inventory: [], equipment: {} });
}
function definitions() {
  return GameDefinitionSchema.parse({
    abilities: [
      { id: "strike", attribute: "STR", offensive: true, effect: "stun" },
      { id: "insight", attribute: "WIL" },
    ],
    encounters: [{ id: "guard", name: "Guard", difficulty: "normal", profile: "balanced" }],
    items: [
      { id: "sword", name: "Sword", slot: "weapon", bonus: { STR: 1, HP: 2 }, ability: "strike" },
    ],
  });
}
it("learns and trains an ability once, then removes equipped gear without changing the RNG", () => {
  const character = hero(),
    game = state(),
    definition = definitions();
  definition.abilities.push({ ...definition.abilities[0]!, id: "new-skill" });
  const act = (kind: string, reference: string, amount = 1) =>
    performAction(
      character,
      game,
      definition,
      GameActionSchema.parse({ id: "test", label: "Test", kind, reference, amount }),
      "test",
    );
  const rng = game.rng;
  act("learn", "new-skill");
  act("learn", "new-skill");
  act("train", "new-skill", 10);
  expect(character.abilities.filter((ability) => ability.id === "new-skill")).toEqual([
    { id: "new-skill", rank: 4 },
  ]);
  expect(() => act("train", "missing")).toThrow("Unknown ability");
  expect(() => act("learn", "missing")).toThrow("Unknown ability");
  act("give-item", "sword");
  equip(character, game, definition, "sword");
  act("remove-item", "sword");
  expect(game.equipment).toEqual({});
  expect(game.inventory).toEqual([]);
  character.health.current = 0;
  expect(() => act("learn", "new-skill")).toThrow("defeat");
  act("heal", "", 100);
  expect(character.health.current).toBe(character.health.max);
  expect(game.rng).toBe(rng);
});

it.each([1, 2])("resolves a failed or successful escape using the retained RNG %s", (rng) => {
  const character = hero(),
    game = state(),
    definition = definitions();
  game.rng = rng;
  game.combat = {
    encounterId: "guard",
    choiceId: "fight",
    hp: 100,
    maxHp: 100,
    damage: 1,
    turn: 1,
    effects: [],
  };
  const outcome = combatTurn(character, game, definition, { kind: "flee" });
  expect(game.lastResult!.dice).toHaveLength(1);
  expect(game.lastResult!.outcome === "escaped").toBe(
    game.lastResult!.roll <= character.attributes[definition.rules.fleeAttribute].current,
  );
  expect(["fight", undefined]).toContain(outcome);
});
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
it("consumes a healing item once, caps healing and applies the opponent's turn without rolling", () => {
  const character = hero(),
    game = state(),
    definition = definitions();
  definition.items.push({
    ...definition.items[0]!,
    id: "balm",
    name: "Balm",
    slot: "none",
    consumable: true,
    healing: 4,
  });
  game.inventory = ["balm"];
  performAction(
    character,
    game,
    definition,
    GameActionSchema.parse({ id: "fight", label: "Fight", kind: "combat", reference: "guard" }),
    "choice",
  );
  character.health.current = 5;
  const rng = game.rng,
    damage = game.combat!.damage;
  combatTurn(character, game, definition, { kind: "item", id: "balm" });
  expect(character.health.current).toBe(Math.max(0, 6 - damage));
  expect(game.inventory).toEqual([]);
  expect(game.rng).toBe(rng);
  expect(() => combatTurn(character, game, definition, { kind: "item", id: "balm" })).toThrow();
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
it("retains the approved enemy formula and corrects its example to 15 HP", () => {
  const character = hero(),
    game = state();
  character.health = { current: 14, max: 14 };
  game.baseMaxHp = 14;
  character.attributes.STR.current = 16;
  expect(enemyProfile(character, game, definitions(), "guard")).toEqual({
    hp: 15,
    damage: 3,
    referenceHp: 11,
    referenceStat: 14,
    turns: 3,
  });
  expect([3, 9, 10, 13, 14, 17, 18].map(damageBonus)).toEqual([0, 0, 1, 1, 2, 2, 3]);
});
it("checkpoints deterministic unbiased dice and applies rank thresholds 5,4,3,2", () => {
  const first = state(),
    copy = structuredClone(first);
  expect(Array.from({ length: 100 }, () => roll(first, 6))).toEqual(
    Array.from({ length: 100 }, () => roll(copy, 6)),
  );
  for (let currentRank = 1; currentRank <= 4; currentRank++) {
    const character = hero(),
      game = state();
    character.abilities[0]!.rank = currentRank;
    performAction(
      character,
      game,
      definitions(),
      GameActionSchema.parse({
        id: "test",
        label: "Check",
        kind: "ability-check",
        reference: "strike",
      }),
      "option-0",
    );
    expect(game.lastResult!.success).toBe(game.lastResult!.roll >= 6 - currentRank);
    expect(game.xp).toBe(1);
  }
});
it("equips one item per slot without free HP and excludes gear from enemy calibration", () => {
  const character = hero(),
    game = state(),
    definition = definitions();
  game.inventory = ["sword"];
  const before = enemyProfile(character, game, definition, "guard");
  equip(character, game, definition, "sword");
  expect(character.health).toEqual({ current: 6, max: 8 });
  expect(rank(character, game, definition, "strike")).toBe(2);
  expect(enemyProfile(character, game, definition, "guard")).toEqual(before);
  character.health.current = 8;
  equip(character, game, definition, "sword", true);
  expect(character.health).toEqual({ current: 6, max: 6 });
});
it("levels at 5 XP with the specified HP sequence and capped attributes", () => {
  const character = hero(),
    game = state();
  character.health.current = 3;
  game.xp = 4;
  awardXp(character, game, 1);
  expect(character.health).toEqual({ current: 6, max: 7 });
  expect(game.baseMaxHp).toBe(7);
  expect(game.xp).toBe(0);
  Object.values(character.attributes).forEach((attribute) => {
    attribute.current = 18;
  });
  awardXp(character, game, 10);
  expect(Object.values(character.attributes).every((attribute) => attribute.current === 18)).toBe(
    true,
  );
});
it("freezes the enemy, rejects gear changes during combat, and awards XP once on victory", () => {
  const character = hero(),
    game = state(),
    definition = definitions();
  game.inventory = ["sword"];
  performAction(
    character,
    game,
    definition,
    GameActionSchema.parse({ id: "battle", label: "Fight", kind: "combat", reference: "guard" }),
    "option-0",
  );
  expect(() => equip(character, game, definition, "sword")).toThrow(/during combat/);
  game.combat!.hp = 1;
  expect(combatTurn(character, game, definition, { kind: "attack" })).toBe("option-0");
  expect(game.combat).toBeUndefined();
  expect(game.xp).toBe(1);
  expect(character.health.current).toBe(6);
  expect(() => combatTurn(character, game, definition, { kind: "attack" })).toThrow();
  expect(game.xp).toBe(1);
});
it("expires a one-turn stun after cancelling exactly one retaliation", () => {
  const character = hero(),
    game = state(),
    definition = definitions();
  game.combat = {
    encounterId: "guard",
    choiceId: "fight",
    hp: 100,
    maxHp: 100,
    damage: 2,
    turn: 1,
    effects: [{ ability: "strike", kind: "stun", turns: 1 }],
  };
  combatTurn(character, game, definition, { kind: "attack" });
  expect(character.health.current).toBe(6);
  expect(game.combat!.effects).toEqual([]);
  combatTurn(character, game, definition, { kind: "attack" });
  expect(character.health.current).toBe(4);
});

it("identifies a received item so the reader can show its notification without guessing from text", () => {
  const character = hero(),
    game = state();
  const action = GameActionSchema.parse({
    id: "pickup",
    label: "A letter arrives",
    kind: "give-item",
    reference: "sword",
  });
  performAction(character, game, definitions(), action, "option-0");
  expect(game.lastResult).toMatchObject({ message: "A letter arrives", itemId: "sword" });
  expect(GameStateSchema.parse(game).inventory).toEqual(["sword"]);
});
