import { checkContext } from "./ChoiceList.tsx";
import { useModalPause } from "./use-modal-pause.ts";
import { useState, useCallback, useEffect } from "react";
import type { ReaderController, ReaderSnapshot } from "../../contracts/story.ts";
import type { Frame, StoryBundle } from "../../contracts/story.ts";
import type { PresentationSession } from "../presentation/presentation-session.ts";
import { ReaderModal } from "../../shared/ReaderModal.tsx";
import { DiceRoll } from "./DiceRoll.tsx";
import { SpellFeedback } from "../presentation/SpellFeedback.tsx";
import type { GameState } from "../../contracts/game.ts";
import { useTranslation } from "react-i18next";

export function CheckRoll({
  bundle,
  director,
  state,
  presentation,
}: {
  bundle: StoryBundle;
  director: ReaderController;
  state: ReaderSnapshot & { frame: Frame; game: GameState; occurrenceId: string };
  presentation?: PresentationSession;
}) {
  const pending = state.game.pendingCheck!;
  const [settled, setSettled] = useState(state.restored);
  useModalPause(presentation);
  const finishDice = useCallback(() => setSettled(true), []);
  useEffect(() => {
    if (!pending.rolled) void director.rollCheck(state.occurrenceId);
  }, [director, state.occurrenceId, pending]);
  const { t } = useTranslation();
  const choice = state.frame.choices
    .concat(state.frame.actions ?? [])
    .find((choice) => choice.id === pending.choiceId);
  const context = choice ? checkContext(bundle, choice, t, state.checkOptions) : null;
  const result = state.game.lastResult;
  return (
    <ReaderModal className="check-roll-modal" title={context?.purpose ?? t("check.title")}>
      <SpellFeedback ability={result?.abilityUsed} instant={state.restored} />
      {context && <p className="check-test">{context.test}</p>}
      {pending.rolled ? (
        <DiceRoll result={result} instant={state.restored} onSettled={finishDice} />
      ) : (
        <p>{t("check.rolling")}</p>
      )}
      {pending.rolled && settled && (
        <p role="status" className="check-outcome">
          {result!.roll} {context?.option?.comparison} {context?.option?.threshold}?{" "}
          <strong data-success={result!.success}>
            {t(result!.success ? "check.success" : "check.failure")}
          </strong>
        </p>
      )}
      {state.failure && (
        <>
          <p role="alert">{t("check.saveFailed")}</p>
          {!pending.rolled && (
            <button onClick={() => void director.rollCheck(state.occurrenceId)}>
              {t("check.retry")}
            </button>
          )}
        </>
      )}
      <button
        className="reader-modal-primary"
        disabled={state.busy || !pending.rolled || !settled}
        onClick={() => void director.finishCheck(state.occurrenceId)}
      >
        {t("check.continue")}
      </button>
    </ReaderModal>
  );
}
