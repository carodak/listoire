import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { StoryProjectSchema } from "../../contracts/editor-project.ts";
import { splitStoryArchive } from "../../contracts/story-archive.ts";
import { applyGameConfiguration } from "./game-authoring.ts";

const { project } = splitStoryArchive(
  JSON.parse(readFileSync(new URL("../../../stories/house/project.json", import.meta.url), "utf8")),
);

it("keeps a valid character when both starting abilities are renamed or removed (REVIEW #14)", () => {
  const game = structuredClone(project.languages.en!.configuration.game!);
  const starting = project.languages.en!.configuration.character!.abilities.map(({ id }) => id);
  game.abilities = game.abilities.filter((ability) => !starting.includes(ability.id));
  for (const action of game.actions)
    if (starting.includes(action.reference ?? "")) action.reference = game.abilities[0]!.id;
  const next = applyGameConfiguration(project, "en", game);
  const abilities = next.languages.en!.configuration.character!.abilities;
  expect(abilities.map(({ id }) => id)).toEqual(game.abilities.slice(0, 2).map(({ id }) => id));
  expect(StoryProjectSchema.safeParse(next).success).toBe(true);
});

it("keeps the starting abilities that still exist, with their names", () => {
  const game = structuredClone(project.languages.en!.configuration.game!);
  const before = project.languages.en!.configuration.character!.abilities;
  const next = applyGameConfiguration(project, "en", game);
  expect(next.languages.en!.configuration.character!.abilities).toEqual(before);
});
