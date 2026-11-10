import { expect, it } from "vitest";
import { rewardChanges } from "./rewards.ts";
import { createCharacter } from "../character/create-character.ts";
import type { StoryBundle } from "../../contracts/story.ts";
import type { GameState } from "../../contracts/game.ts";

const bundle = {
  game: { items: [{ id: "letter", name: "The letter" }], abilities: [] },
  character: { abilities: [{ id: "light", name: "Little Light" }] },
} as unknown as StoryBundle;

function player() {
  const character = createCharacter(["observation"], () => 3);
  const game: GameState = { rng: 1, xp: 0, baseMaxHp: 6, inventory: [], equipment: {} };
  return { character, game };
}

it("names new items and abilities, rank-ups, XP across a level and healing", () => {
  const before = player();
  before.character.health.current = 2;
  const after = structuredClone(before);
  after.game.inventory.push("letter");
  after.character.abilities.push({ id: "light", rank: 1 });
  after.character.abilities[0]!.rank = 2;
  after.game.xp = 1; // 4 XP before the level, 1 after: 5 + 1 - 0
  after.game.baseMaxHp = 7;
  after.character.health.current = 5;
  expect(rewardChanges(before, after, bundle)).toEqual([
    { kind: "item", name: "The letter" },
    { kind: "rank", name: "observation", rank: 2 },
    { kind: "ability", name: "Little Light" },
    { kind: "xp", count: 6 },
    { kind: "level", count: 1 },
    { kind: "hp", count: 3 },
  ]);
});

it("reports nothing for losses: damage, a used item, nothing changed", () => {
  const before = player();
  before.game.inventory.push("letter");
  const after = structuredClone(before);
  after.game.inventory = [];
  after.character.health.current = 1;
  expect(rewardChanges(before, after, bundle)).toEqual([]);
  expect(rewardChanges(before, before, bundle)).toEqual([]);
});
