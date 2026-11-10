import { useModalPause } from "./use-modal-pause.ts";
import { useState, useCallback, useEffect } from "react";
import { CheckRoll } from "./CheckRoll.tsx";
import type { Frame, StoryBundle } from "../../contracts/story.ts";
import type { ReaderController, ReaderSnapshot } from "../../contracts/story.ts";
import { ReaderModal } from "../../shared/ReaderModal.tsx";
import { inventoryCategory } from "../character/inventory-category.ts";
import type { PresentationSession } from "../presentation/presentation-session.ts";
import { CombatControls } from "./CombatControls.tsx";
import { DiceRoll } from "./DiceRoll.tsx";
import { useTranslation } from "react-i18next";
import { combatLines } from "./combat-log.ts";

interface GamePanelProps {
  bundle: StoryBundle;
  director: ReaderController;
  state: ReaderSnapshot & { frame: Frame };
  presentation?: PresentationSession;
  combatReady?: boolean;
}

export function GamePanel({
  bundle,
  director,
  state,
  presentation,
  combatReady = false,
}: GamePanelProps) {
  if (!state.game || !state.character || !state.occurrenceId) return null;
  const active = { ...state, game: state.game, occurrenceId: state.occurrenceId };
  const ending = combatEnding(state.game);
  return (
    <>
      {state.game.pendingCheck && (
        <CheckRoll bundle={bundle} director={director} state={active} presentation={presentation} />
      )}
      {state.game.combat && combatReady && (
        <CombatEncounter
          bundle={bundle}
          director={director}
          state={state}
          presentation={presentation}
        />
      )}
      {ending && (
        <CombatEnding
          outcome={ending}
          bundle={bundle}
          director={director}
          state={state}
          presentation={presentation}
        />
      )}
      <RewardEvent director={director} state={state} />
    </>
  );
}
function CombatEncounter({
  bundle,
  director,
  state,
  presentation,
}: Pick<GamePanelProps, "bundle" | "director" | "state" | "presentation">) {
  useModalPause(presentation);
  return (
    <ReaderModal className="reader-combat-modal" title="Combat">
      <CombatControls
        bundle={bundle}
        director={director}
        state={state}
        presentation={presentation}
      />
    </ReaderModal>
  );
}
/** A finished encounter waits on its story event; the combat window announces how it ended. */
function combatEnding(game: ReaderSnapshot["game"]) {
  return game?.pendingEvent ? game.lastResult?.outcome : undefined;
}
type CombatOutcome = NonNullable<ReturnType<typeof combatEnding>>;

/** Time to read the outcome and the last turn before the story moves on. */
const ENDING_HOLD_MS = 2000;

function CombatEnding({
  outcome,
  bundle,
  director,
  state,
  presentation,
}: Pick<GamePanelProps, "bundle" | "director" | "state" | "presentation"> & {
  outcome: CombatOutcome;
}) {
  useModalPause(presentation);
  const { t } = useTranslation();
  const result = state.game!.lastResult!;
  const [settled, setSettled] = useState(state.restored || !result.dice?.length);
  const finishDice = useCallback(() => setSettled(true), []);
  const finish = useCallback(
    () => void director.finishEvent(state.occurrenceId!),
    [director, state.occurrenceId],
  );
  useEffect(() => {
    if (!settled || state.failure) return;
    const timer = setTimeout(finish, ENDING_HOLD_MS);
    return () => clearTimeout(timer);
  }, [settled, state.failure, finish]);
  return (
    <ReaderModal
      className="reader-combat-modal combat-ending"
      title={t("combat.title")}
      closeLabel={t("combat.continue")}
      onDismiss={state.failure ? finish : undefined}
    >
      <p className="combat-ending-title" data-outcome={outcome} role="status">
        {t(`combat.outcome.${outcome}`)}
      </p>
      <ol className="combat-feedback combat-log" aria-label={t("combat.log")}>
        {combatLines(result, t).map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ol>
      <DiceRoll
        result={result}
        french={bundle.locale.startsWith("fr")}
        instant={state.restored}
        onSettled={finishDice}
      />
      {state.failure && <p role="alert">{t("combat.saveFailed")}</p>}
    </ReaderModal>
  );
}

/**
 * A reward (item, ability, healing, XP) no longer stops the story: the reader sees it in the
 * notification stack and the page continues. A restored or retried event finishes the same way.
 */
function RewardEvent({ director, state }: Pick<GamePanelProps, "director" | "state">) {
  const pending = Boolean(state.game?.pendingEvent) && !combatEnding(state.game);
  const { occurrenceId, failure, busy } = state;
  useEffect(() => {
    if (pending && !failure && !busy) void director.finishEvent(occurrenceId!);
  }, [pending, failure, busy, director, occurrenceId]);
  return null;
}

export function GameInventory({ bundle, director, state }: GamePanelProps) {
  const { game, occurrenceId } = state;
  if (!game || !occurrenceId || !game.inventory.length) return null;
  const combat = game.combat;
  const french = bundle.locale.startsWith("fr");
  return (
    <div className="game-inventory">
      {game.inventory.map((id) => {
        const item = bundle.game?.items.find((item) => item.id === id);
        if (!item) return null;
        const selected = Object.values(game.equipment).includes(id);
        return (
          <div className="game-inventory-item" key={id} data-kind={inventoryCategory(item)}>
            <span>{item.name}</span>
            {item.slot !== "none" && (
              <button
                disabled={state.busy || Boolean(combat)}
                title={
                  french
                    ? "Équipement verrouillé pendant le combat"
                    : "Equipment is locked during combat"
                }
                onClick={() =>
                  void director.gameTurn({ kind: selected ? "unequip" : "equip", id }, occurrenceId)
                }
              >
                {selected ? (french ? "Retirer" : "Unequip") : french ? "Équiper" : "Equip"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
