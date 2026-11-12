import { expect, it } from "vitest";
import { GameActionSchema, GameStateSchema } from "../../contracts/game.ts";
import { performAction } from "./actions.ts";
import { equip } from "./character.ts";
import { combatTurn } from "./combat.ts";
import {
  rulesDefinitions as definitions,
  rulesHero as hero,
  rulesInCombat as inCombat,
  rulesState as state,
} from "../../test-fixtures.ts";

const fight = (reference = "guard") =>
  GameActionSchema.parse({ id: "battle", label: "Fight", kind: "combat", reference });

it.each([1, 2])("resolves a failed or successful escape using the retained RNG %s", (rng) => {
  const character = hero(),
    game = inCombat(),
    definition = definitions();
  game.rng = rng;
  const outcome = combatTurn(character, game, definition, { kind: "flee" });
  expect(game.lastResult!.dice).toHaveLength(1);
  expect(game.lastResult!.outcome === "escaped").toBe(
    game.lastResult!.roll <= character.attributes[definition.rules.fleeAttribute].current,
  );
  expect(["fight", undefined]).toContain(outcome);
});

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
  performAction(character, game, definition, fight(), "choice");
  character.health.current = 5;
  const rng = game.rng,
    damage = game.combat!.damage;
  combatTurn(character, game, definition, { kind: "item", id: "balm" });
  expect(character.health.current).toBe(Math.max(0, 6 - damage));
  expect(game.inventory).toEqual([]);
  expect(game.rng).toBe(rng);
  expect(() => combatTurn(character, game, definition, { kind: "item", id: "balm" })).toThrow();
});

it("freezes the enemy, rejects gear changes during combat, and awards XP once on victory", () => {
  const character = hero(),
    game = state(),
    definition = definitions();
  game.inventory = ["sword"];
  performAction(character, game, definition, fight(), "option-0");
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
    game = inCombat({ damage: 2, effects: [{ ability: "strike", kind: "stun", turns: 1 }] });
  combatTurn(character, game, definitions(), { kind: "attack" });
  expect(character.health.current).toBe(6);
  expect(game.combat!.effects).toEqual([]);
  combatTurn(character, game, definitions(), { kind: "attack" });
  expect(character.health.current).toBe(4);
});

it("records damage dealt and received as numbers alongside the legacy message", () => {
  const character = hero(),
    game = inCombat({ hp: 200, maxHp: 200, damage: 2 });
  const enemyBefore = game.combat!.hp;
  const heroBefore = character.health.current;
  combatTurn(character, game, definitions(), { kind: "attack" });
  const result = game.lastResult!;
  expect(result.dealt).toBe(enemyBefore - game.combat!.hp);
  expect(result.received).toBe(heroBefore - character.health.current);
  expect(result.message).toBe(`${result.dealt} damage dealt · ${result.received} damage received`);
  expect(() => GameStateSchema.parse(game)).not.toThrow();
});

it("never stores more than two combat effects, so the state stays saveable", () => {
  let exercised = 0;
  for (let rng = 1; rng <= 300; rng++) {
    const character = hero(),
      game = inCombat({
        hp: 200,
        maxHp: 200,
        damage: 2,
        effects: [
          { ability: "blast", kind: "weaken", turns: 3 },
          { ability: "hex", kind: "weaken", turns: 3 },
        ],
      });
    game.rng = rng;
    combatTurn(character, game, definitions(), { kind: "ability", id: "strike" });
    const effects = game.combat?.effects ?? [];
    expect(effects.length).toBeLessThanOrEqual(2);
    expect(() => GameStateSchema.parse(game)).not.toThrow();
    // A third ability's stun displaced the oldest effect (it may then age out this turn).
    if (effects.length < 2 || effects.some((effect) => effect.kind === "stun")) exercised++;
  }
  expect(exercised).toBeGreaterThan(0);
});
