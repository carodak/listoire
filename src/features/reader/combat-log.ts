import { useEffect, useRef, useState } from "react";
import type { TFunction } from "i18next";
import type { GameState } from "../../contracts/game.ts";

type Result = NonNullable<GameState["lastResult"]>;

/** One turn in reading order: your action, then the enemy's. Older saves keep their message. */
export function combatLines(
  result: Result,
  t: TFunction,
  itemName: (id: string) => string = (id) => id,
): string[] {
  const action =
    result.dealt !== undefined
      ? t("combat.youAttack", { count: result.dealt })
      : result.usedItem !== undefined
        ? t("combat.useItem", { item: itemName(result.usedItem), count: result.healed ?? 0 })
        : result.fled !== undefined
          ? t(result.fled ? "combat.escaped" : "combat.escapeFailed", { roll: result.roll })
          : undefined;
  if (action === undefined) return [result.message];
  return [
    action,
    ...(result.received === undefined
      ? []
      : [t("combat.enemyAttacks", { count: result.received })]),
  ];
}

/** The enemy answers this long after your action shows, so each blow reads on its own. */
const ENEMY_DELAY_MS = 1000;

type Log = {
  lines: string[];
  enemyHits: number;
  playerHits: number;
  busy: boolean;
  /** The results whose action, and whose answer, are on screen (HP bars follow them). */
  acted?: Result;
  answered?: Result;
};

/**
 * Appends each turn once its dice have settled, in two beats: your action (and the hit on the
 * enemy), then a second later the enemy's answer (and the hit on you). `busy` is true between
 * the two, so the next move waits. Hit counters change per landed blow to replay the effects.
 */
export function useCombatLog(
  result: GameState["lastResult"],
  ready: boolean,
  t: TFunction,
  itemName?: (id: string) => string,
) {
  const [log, setLog] = useState<Log>({ lines: [], enemyHits: 0, playerHits: 0, busy: false });
  const logged = useRef<Result | undefined>(undefined);
  const answer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(answer.current), []);
  useEffect(() => {
    if (!result || !ready || logged.current === result) return;
    logged.current = result;
    const [action, ...reply] = combatLines(result, t, itemName);
    const enemyHit = result.dealt ? 1 : 0;
    setLog((before) => ({
      ...before,
      lines: [...before.lines, action!],
      enemyHits: before.enemyHits + enemyHit,
      busy: reply.length > 0,
      acted: result,
      answered: reply.length ? before.answered : result,
    }));
    if (!reply.length) return;
    answer.current = setTimeout(
      () =>
        setLog((before) => ({
          ...before,
          lines: [...before.lines, ...reply],
          playerHits: before.playerHits + (result.received ? 1 : 0),
          busy: false,
          answered: result,
        })),
      ENEMY_DELAY_MS,
    );
  }, [result, ready, t, itemName]);
  // A settled result the effect hasn't logged yet is busy too: otherwise, for one render, the
  // combat looks finished before its last beats (and the ending's hold starts too early).
  return { ...log, busy: log.busy || (ready && result !== undefined && result !== log.acted) };
}
