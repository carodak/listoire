import { prefersReducedMotion } from "../../contracts/reduced-motion.ts";
import type { GameState } from "../../contracts/game.ts";
import { useTranslation } from "react-i18next";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";

const DiceModel = lazy(() =>
  import("../presentation/DiceModel.tsx").then((module) => ({ default: module.DiceModel })),
);

export function DiceRoll({
  result,
  instant = false,
  onSettled,
}: {
  result: GameState["lastResult"];
  instant?: boolean;
  onSettled?: () => void;
}) {
  const { t } = useTranslation();
  const [rolling, setRolling] = useState(!instant);
  const dice = result?.dice;
  const [finishedModels, setFinishedModels] = useState(0);
  const finishModel = useCallback(() => setFinishedModels((count) => count + 1), []);
  const reduced = prefersReducedMotion();
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
      aria-label={t("dice.results")}
    >
      {result.dice.map((die, index) => (
        <DieFace
          key={index}
          die={die}
          rolling={rolling}
          animate={!instant && !reduced}
          onSettled={finishModel}
        />
      ))}
    </div>
  );
}

function DieFace({
  die,
  rolling,
  animate,
  onSettled,
}: {
  die: NonNullable<NonNullable<GameState["lastResult"]>["dice"]>[number];
  rolling: boolean;
  animate: boolean;
  onSettled: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="dice-result"
      data-sides={die.sides}
      aria-label={rolling ? t("dice.rolling") : `d${die.sides}: ${die.value}`}
    >
      <small>d{die.sides}</small>
      {die.sides === 6 || die.sides === 20 ? (
        <Suspense fallback={<span className="die-model die-loading" aria-hidden="true" />}>
          <DiceModel sides={die.sides} value={die.value} animate={animate} onSettled={onSettled} />
        </Suspense>
      ) : (
        <span className="die-model die-unavailable" aria-hidden="true">
          {die.value}
        </span>
      )}
      <strong className="die-value">{rolling ? "" : die.value}</strong>
    </div>
  );
}
