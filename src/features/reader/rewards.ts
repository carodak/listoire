import type { CharacterProfile } from "../../contracts/character.ts";
import type { GameState } from "../../contracts/game.ts";
import type { StoryBundle } from "../../contracts/story.ts";

type Player = { character: CharacterProfile; game: GameState };
export type Reward =
  | { kind: "item" | "ability"; name: string }
  | { kind: "rank"; name: string; rank: number }
  | { kind: "xp" | "hp" | "level"; count: number };

const LEVEL_XP = 5; // awardXp: every 5 XP raise the base maximum HP by one

/** What the reader gained between two committed states: items, abilities, XP, levels, HP. */
export function rewardChanges(before: Player, after: Player, bundle: StoryBundle): Reward[] {
  const itemName = (id: string) => bundle.game?.items.find((item) => item.id === id)?.name ?? id;
  const abilityName = (id: string) =>
    bundle.character?.abilities.find((ability) => ability.id === id)?.name ??
    bundle.game?.abilities.find((ability) => ability.id === id)?.name ??
    id;
  const rewards: Reward[] = after.game.inventory
    .filter((id) => !before.game.inventory.includes(id))
    .map((id) => ({ kind: "item", name: itemName(id) }));
  for (const ability of after.character.abilities) {
    const previous = before.character.abilities.find((known) => known.id === ability.id);
    if (!previous) rewards.push({ kind: "ability", name: abilityName(ability.id) });
    else if (ability.rank > previous.rank)
      rewards.push({ kind: "rank", name: abilityName(ability.id), rank: ability.rank });
  }
  const levels = after.game.baseMaxHp - before.game.baseMaxHp;
  const xp = after.game.xp - before.game.xp + LEVEL_XP * Math.max(0, levels);
  if (xp > 0) rewards.push({ kind: "xp", count: xp });
  if (levels > 0) rewards.push({ kind: "level", count: levels });
  const healed = after.character.health.current - before.character.health.current;
  if (healed > 0) rewards.push({ kind: "hp", count: healed });
  return rewards;
}
