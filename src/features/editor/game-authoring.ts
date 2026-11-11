import type { StoryProject } from "../../contracts/editor-project.ts";
import { GameDefinitionSchema } from "../../contracts/game.ts";
import type { GameDefinition } from "../../contracts/game.ts";

export function applyGameConfiguration(
  project: StoryProject,
  locale: string,
  game: GameDefinition,
  insertedAction?: string,
) {
  const valid = GameDefinitionSchema.parse(game),
    next = structuredClone(project);
  for (const [id, language] of Object.entries(next.languages)) {
    if (id === locale || project.shareConfiguration) language.configuration.game = valid;
    else if (insertedAction)
      language.configuration.game = mergeAction(language.configuration.game, valid, insertedAction);
    else continue;
    const definitions = language.configuration.game!;
    const existing = language.configuration.character;
    const kept = definitions.abilities.filter((item) =>
      existing?.abilities.some((ability) => ability.id === item.id),
    );
    language.configuration.character = {
      portrait: existing?.portrait ?? "",
      inventory: existing?.inventory ?? [],
      encounters: existing?.encounters ?? [],
      // A character needs at least one ability: when none of the starting ones is left
      // (renamed or removed), start with the first two defined.
      abilities: (kept.length ? kept : definitions.abilities).slice(0, 2).map(
        (item) =>
          existing?.abilities.find((ability) => ability.id === item.id) ?? {
            id: item.id,
            name: item.id,
            description: "",
          },
      ),
    };
  }
  next.gameMode = valid.actions.some((action) => action.kind === "combat")
    ? "with-combat"
    : project.gameMode === "narrative"
      ? "rpg-no-combat"
      : project.gameMode;
  return next;
}
function mergeAction(
  current: GameDefinition | undefined,
  source: GameDefinition,
  id: string,
): GameDefinition {
  const target = GameDefinitionSchema.parse(current ?? {});
  const action = source.actions.find((action) => action.id === id);
  if (!action) throw new Error("Unknown game action");
  const merge = <T extends { id: string }>(existing: T[], incoming: T[]) => [
    ...existing,
    ...incoming.filter((item) => !existing.some((entry) => entry.id === item.id)),
  ];
  return GameDefinitionSchema.parse({
    ...target,
    actions: merge(target.actions, [action]),
    items: merge(
      target.items,
      source.items.filter((item) => item.id === action.reference),
    ),
    encounters: merge(
      target.encounters,
      source.encounters.filter((item) => item.id === action.reference),
    ),
    abilities: merge(target.abilities, source.abilities),
  });
}
export function initialGame(project: StoryProject, locale: string) {
  const language = project.languages[locale]!;
  return GameDefinitionSchema.parse(
    language.configuration.game ?? {
      abilities: language.configuration.character?.abilities.map((item) => ({
        id: item.id,
        attribute: "WIL",
      })) ?? [
        { id: "investigation", attribute: "WIL" },
        { id: "intuition", attribute: "WIL" },
      ],
    },
  );
}
