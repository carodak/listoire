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

/**
 * Appends each new turn once its dice have settled, so earlier turns stay readable.
 * `hits` counts landed blows, to replay the hit effect on the enemy.
 */
export function useCombatLog(
  result: GameState["lastResult"],
  ready: boolean,
  t: TFunction,
  itemName?: (id: string) => string,
) {
  const [log, setLog] = useState<{ lines: string[]; hits: number }>({ lines: [], hits: 0 });
  const logged = useRef<Result | undefined>(undefined);
  useEffect(() => {
    if (!result || !ready || logged.current === result) return;
    logged.current = result;
    setLog((before) => ({
      lines: [...before.lines, ...combatLines(result, t, itemName)],
      hits: before.hits + (result.dealt ? 1 : 0),
    }));
  }, [result, ready, t, itemName]);
  return log;
}
