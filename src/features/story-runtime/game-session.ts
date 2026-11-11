import { GameDefinitionSchema } from "../../contracts/game.ts";
import type { PlayerMove, GameState } from "../../contracts/game.ts";
import type { CharacterProfile } from "../../contracts/character.ts";
import { ReaderFailure } from "../../contracts/story.ts";
import type { SaveData, StoryBundle } from "../../contracts/story.ts";
import { performAction } from "../rules/actions.ts";
import { combatTurn } from "../rules/combat.ts";
import { equip } from "../rules/character.ts";
import { combatOptions } from "../rules/combat-options.ts";
import { checkOptions } from "../rules/check-options.ts";
import { characterAttributes } from "../rules/character.ts";

type Update = { character: CharacterProfile; game: GameState };
export function copyPlayer(before: SaveData): Update {
  if (!before.character || !before.game) throw new ReaderFailure("content");
  return { character: structuredClone(before.character), game: structuredClone(before.game) };
}
export function playerDetails(
  bundle: StoryBundle,
  character: CharacterProfile | null,
  game: GameState | null,
) {
  return {
    attributeDetails: character ? characterAttributes(character, game, bundle.game) : null,
    combatOptions:
      character && game && bundle.game ? combatOptions(character, game, bundle.game) : [],
    checkOptions:
      character && game && bundle.game ? checkOptions(character, game, bundle.game) : {},
  };
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
  deferRoll = false,
) {
  const definition = GameDefinitionSchema.parse(bundle.game ?? {});
  const action = definition.actions.find((action) => action.id === id);
  if (!action || (action.kind === "combat" && bundle.mode !== "with-combat"))
    throw new ReaderFailure("content");
  const update = copyPlayer(before);
  ruled(() => performAction(update.character, update.game, definition, action, choiceId));
  if (deferRoll && ["stat-check", "ability-check"].includes(action.kind))
    update.game.pendingCheck = {
      actionId: id,
      choiceId,
      rolled: true,
      origin: checkOrigin(before),
    };
  return update;
}
/** A rule that refuses (unknown ability, item that cannot be equipped…) is the story's data, not storage. */
function ruled<T>(apply: () => T): T {
  try {
    return apply();
  } catch {
    throw new ReaderFailure("content");
  }
}
export function resolveGameTurn(bundle: StoryBundle, before: SaveData, move: PlayerMove) {
  const update = copyPlayer(before);
  const definition = GameDefinitionSchema.parse(bundle.game ?? {});
  let choice: string | undefined;
  ruled(() => {
    if (move.kind === "equip" || move.kind === "unequip")
      equip(update.character, update.game, definition, move.id, move.kind === "unequip");
    else choice = combatTurn(update.character, update.game, definition, move);
  });
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

export function beforeCheck(save: SaveData): SaveData {
  const restored = structuredClone(save);
  const origin = restored.game?.pendingCheck?.origin;
  // shortcut: Older completed rolls lack an origin; retain their result until those saves are retired.
  if (restored.game?.pendingCheck?.rolled && !origin) return restored;
  if (origin && restored.game) {
    const { character, ...state } = origin;
    restored.character = character;
    Object.assign(restored.game, state);
    restored.game.lastResult = origin.lastResult;
  }
  if (restored.game) delete restored.game.pendingCheck;
  return restored;
}

/** The page as it was reached, before any fight or reward on it, for Back. */
export function reachedPage(start: SaveData | null, before: SaveData): SaveData {
  const game = start?.game;
  if (start && !game?.combat && !game?.pendingEvent && !game?.pendingCheck) return start;
  // A checkpoint reloaded mid-fight has no clean start: keep its stats, drop the ending.
  return before.game
    ? { ...before, game: { ...before.game, pendingEvent: undefined, lastResult: undefined } }
    : before;
}

export function checkOrigin(before: SaveData) {
  return {
    character: structuredClone(before.character!),
    rng: before.game!.rng,
    xp: before.game!.xp,
    baseMaxHp: before.game!.baseMaxHp,
    lastResult: before.game!.lastResult,
  };
}
