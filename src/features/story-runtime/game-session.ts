import { GameDefinitionSchema } from "../../contracts/game.ts";
import type { GameMove, GameState } from "../../contracts/game.ts";
import type { CharacterProfile } from "../../contracts/character.ts";
import { ReaderFailure } from "../../contracts/story.ts";
import type { SaveData, StoryBundle } from "../../contracts/story.ts";
import { performAction } from "../rules/actions.ts";
import { combatTurn } from "../rules/combat.ts";
import { equip } from "../rules/character.ts";

type Update = { character: CharacterProfile; game: GameState };
export type PlayerMove = GameMove | { kind: "equip"; id: string } | { kind: "unequip"; id: string };
function copyPlayer(before: SaveData): Update {
  if (!before.character || !before.game) throw new ReaderFailure("content");
  return { character: structuredClone(before.character), game: structuredClone(before.game) };
}
export function startPlayer(
  bundle: StoryBundle,
  before?: SaveData | null,
  create?: () => CharacterProfile,
) {
  const character = before?.character ?? (bundle.character ? create?.() : undefined);
  const game = character
    ? (before?.game ?? {
        rng: crypto.getRandomValues(new Uint32Array(1))[0] || 1,
        xp: 0,
        baseMaxHp: character.health.max,
        inventory: [],
        equipment: {},
      })
    : undefined;
  return { character, game };
}
export function resolveGameAction(
  bundle: StoryBundle,
  before: SaveData,
  id: string,
  choiceId: string,
) {
  const definition = GameDefinitionSchema.parse(bundle.game ?? {});
  const action = definition.actions.find((action) => action.id === id);
  if (!action || (action.kind === "combat" && bundle.mode !== "with-combat"))
    throw new ReaderFailure("content");
  const update = copyPlayer(before);
  performAction(update.character, update.game, definition, action, choiceId);
  return update;
}
export function resolveGameTurn(bundle: StoryBundle, before: SaveData, move: PlayerMove) {
  const update = copyPlayer(before);
  const definition = GameDefinitionSchema.parse(bundle.game ?? {});
  let choice: string | undefined;
  if (move.kind === "equip" || move.kind === "unequip")
    equip(update.character, update.game, definition, move.id, move.kind === "unequip");
  else choice = combatTurn(update.character, update.game, definition, move);
  return { ...update, choice };
}
export function gameFacts(update: Update) {
  return {
    game_success: update.game.lastResult?.success ?? true,
    game_roll: update.game.lastResult?.roll ?? 0,
    game_hp: update.character.health.current,
    game_xp: update.game.xp,
    game_outcome:
      ["victory", "escaped", "defeat", "charmed"].indexOf(update.game.lastResult?.outcome ?? "") +
      1,
  };
}
