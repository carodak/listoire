import { readFileSync } from "node:fs";
import { BundleSchema } from "./contracts/story.ts";
import { GameDefinitionSchema, GameStateSchema } from "./contracts/game.ts";
import type { GameState } from "./contracts/game.ts";
import { createCharacter } from "./features/character/create-character.ts";
import type { Locale } from "./contracts/story.ts";

export function fixtureBundle(locale: Locale = "en") {
  return BundleSchema.parse(
    JSON.parse(
      readFileSync(new URL(`../.fallow/fixtures/${locale}.json`, import.meta.url), "utf8"),
    ),
  );
}

/** The rules tests' hero: Strike (offensive, stuns) and Insight, every roll a 4. */
export const rulesHero = () => createCharacter(["strike", "insight"], () => 4);

export const rulesState = () =>
  GameStateSchema.parse({ rng: 4812, xp: 0, baseMaxHp: 6, inventory: [], equipment: {} });

export function rulesDefinitions() {
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

/** A game already fighting the guard. */
export function rulesInCombat(combat: Partial<NonNullable<GameState["combat"]>> = {}) {
  const game = rulesState();
  game.combat = {
    encounterId: "guard",
    choiceId: "fight",
    hp: 100,
    maxHp: 100,
    damage: 1,
    turn: 1,
    effects: [],
    ...combat,
  };
  return game;
}
