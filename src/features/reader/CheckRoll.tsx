import { checkContext } from "./ChoiceList.tsx";
import { useModalPause } from "./use-modal-pause.ts";
import { useState, useCallback, useEffect } from "react";
import type { ReaderController, ReaderSnapshot } from "../../contracts/story.ts";
import type { Frame, StoryBundle } from "../../contracts/story.ts";
import type { PresentationSession } from "../presentation/presentation-session.ts";
import { ReaderModal } from "../../shared/ReaderModal.tsx";
import { DiceRoll } from "./DiceRoll.tsx";
import { SpellFeedback } from "../presentation/SpellFeedback.tsx";
import type { GameState, CheckOption } from "../../contracts/game.ts";

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
  const french = bundle.locale === "fr";
  const labels = checkLabels[french ? "fr" : "en"];
  const choice = state.frame.choices
    .concat(state.frame.actions ?? [])
    .find((choice) => choice.id === pending.choiceId);
  const context = choice ? checkContext(bundle, choice, state.checkOptions) : null;
  const result = state.game.lastResult;
  return (
    <ReaderModal className="check-roll-modal" title={context?.purpose ?? labels.title}>
      <SpellFeedback ability={result?.abilityUsed} instant={state.restored} />
      {context && <p className="check-test">{context.test}</p>}
      {pending.rolled ? (
        <DiceRoll result={result} french={french} instant={state.restored} onSettled={finishDice} />
      ) : (
        <p>{labels.prompt}</p>
      )}
      {pending.rolled && settled && (
        <CheckOutcome result={result!} option={context?.option} french={french} />
      )}
      {state.failure && (
        <>
          <p role="alert">{labels.failure}</p>
          {!pending.rolled && (
            <button onClick={() => void director.rollCheck(state.occurrenceId)}>
              {french ? "Réessayer le jet" : "Retry roll"}
            </button>
          )}
        </>
      )}
      <button
        className="reader-modal-primary"
        disabled={state.busy || !pending.rolled || !settled}
        onClick={() => void director.finishCheck(state.occurrenceId)}
      >
        {labels.continue}
      </button>
    </ReaderModal>
  );
}

function CheckOutcome({
  result,
  option,
  french,
}: {
  result: NonNullable<GameState["lastResult"]>;
  option?: CheckOption;
  french: boolean;
}) {
  const labels = french
    ? { success: "Réussite", failure: "Échec" }
    : { success: "Success", failure: "Failure" };
  return (
    <p role="status" className="check-outcome">
      {result.roll} {option?.comparison} {option?.threshold}?{" "}
      <strong data-success={result.success}>
        {result.success ? labels.success : labels.failure}
      </strong>
    </p>
  );
}

const checkLabels = {
  fr: {
    title: "Épreuve",
    prompt: "Lancer en cours…",
    failure: "Sauvegarde impossible. Réessaie.",
    continue: "Continuer",
  },
  en: {
    title: "Check",
    prompt: "Rolling…",
    failure: "Could not save. Please retry.",
    continue: "Continue",
  },
};
