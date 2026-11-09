import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { GameInventory } from "./GamePanel.tsx";
import { fixtureBundle } from "../../test-fixtures.ts";
import { GameDefinitionSchema, GameStateSchema } from "../../contracts/game.ts";
import { StoryDirector } from "../story-runtime/director.ts";
import { InkNarrativeEngine } from "../story-runtime/ink-engine.ts";

it.each(["en", "fr"])("renders equipment state and locks changes during combat in %s", (locale) => {
  const bundle = {
    ...fixtureBundle(),
    locale,
    game: GameDefinitionSchema.parse({
      items: [
        { id: "sword", name: "Sword", slot: "weapon" },
        { id: "letter", name: "Letter", slot: "none" },
      ],
    }),
  };
  const director = new StoryDirector(bundle, new InkNarrativeEngine(bundle), {
    read: async () => null,
    commit: async () => {},
  });
  const state = {
    ...director.getSnapshot(),
    occurrenceId: "test",
    frame: { passageId: "start", segments: [], choices: [] },
    game: GameStateSchema.parse({
      rng: 1,
      xp: 0,
      baseMaxHp: 6,
      inventory: ["sword", "letter", "missing"],
      equipment: {},
    }),
  };
  const render = () =>
    renderToStaticMarkup(createElement(GameInventory, { bundle, state, director }));
  expect(render()).toContain(locale === "fr" ? "Équiper" : "Equip");
  expect(render()).toContain("Letter");
  expect(render()).not.toContain("missing");
  state.game.equipment.weapon = "sword";
  expect(render()).toContain(locale === "fr" ? "Retirer" : "Unequip");
  state.game.combat = {
    encounterId: "guard",
    choiceId: "fight",
    hp: 1,
    maxHp: 1,
    damage: 1,
    turn: 1,
    effects: [],
  };
  expect(render()).toContain('disabled=""');
  expect(state.game.rng).toBe(1);
});
