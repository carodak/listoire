import type { GameState } from "../../contracts/game.ts";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";

const DiceModel = lazy(() =>
  import("../presentation/DiceModel.tsx").then((module) => ({ default: module.DiceModel })),
);

export function DiceRoll({
  result,
  french,
  instant = false,
  onSettled,
}: {
  result: GameState["lastResult"];
  french: boolean;
  instant?: boolean;
  onSettled?: () => void;
}) {
  const [rolling, setRolling] = useState(!instant);
  const dice = result?.dice;
  const [finishedModels, setFinishedModels] = useState(0);
  const finishModel = useCallback(() => setFinishedModels((count) => count + 1), []);
  const reduced =
    typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const modelCount = dice?.filter((die) => die.sides === 6 || die.sides === 20).length ?? 0;
  useEffect(() => {
    if (!dice?.length) return;
    if (!instant && !reduced && modelCount && finishedModels < modelCount) return;

    const timer = setTimeout(
      () => {
        setRolling(false);
        onSettled?.();
      },
      instant || reduced || modelCount ? 0 : 850,
    );
    return () => clearTimeout(timer);
  }, [dice, instant, reduced, onSettled, modelCount, finishedModels]);
  if (!result?.dice?.length) return null;
  return (
    <div
      className={`dice-roll${rolling ? " dice-rolling" : ""}`}
      role="group"
      aria-label={french ? "Résultat des dés" : "Dice results"}
    >
      {result.dice.map((die, index) => (
        <div
          className="dice-result"
          data-sides={die.sides}
          key={index}
          aria-label={
            rolling ? (french ? "Dé en mouvement" : "Rolling die") : `d${die.sides}: ${die.value}`
          }
        >
          <small>d{die.sides}</small>
          {die.sides === 6 || die.sides === 20 ? (
            <Suspense fallback={<span className="die-model die-loading" aria-hidden="true" />}>
              <DiceModel
                sides={die.sides}
                value={die.value}
                animate={!instant && !reduced}
                onSettled={finishModel}
              />
            </Suspense>
          ) : (
            <span className="die-model die-unavailable" aria-hidden="true">
              {die.value}
            </span>
          )}
          <strong className="die-value">{rolling ? "" : die.value}</strong>
        </div>
      ))}
    </div>
  );
}
