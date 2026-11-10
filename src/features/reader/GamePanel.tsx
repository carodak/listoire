import { useModalPause } from "./use-modal-pause.ts";
import { useState, useCallback, useEffect } from "react";
import { CheckRoll } from "./CheckRoll.tsx";
import type { Frame, StoryBundle } from "../../contracts/story.ts";
import type { ReaderController, ReaderSnapshot } from "../../contracts/story.ts";
import { ReaderModal } from "../../shared/ReaderModal.tsx";
import { inventoryCategory } from "../character/inventory-category.ts";
import type { PresentationSession } from "../presentation/presentation-session.ts";
import { CombatControls } from "./CombatControls.tsx";
import type { CombatOutcome } from "./CombatControls.tsx";
import { useReducedMotion } from "../../shared/use-reduced-motion.ts";
import { useTranslation } from "react-i18next";

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
      {((state.game.combat && combatReady) || ending) && (
        <CombatWindow
          ending={ending}
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
/** A finished encounter waits on its story event; the combat window announces how it ended. */
function combatEnding(game: ReaderSnapshot["game"]) {
  return game?.pendingEvent ? game.lastResult?.outcome : undefined;
}

/** Time to read the outcome between the portraits before the window fades out. */
const ENDING_HOLD_MS = 2000;
/** The window's fade-out (CSS `combat-closing`); none under reduced motion. */
const CLOSING_MS = 450;

/**
 * One window from the first turn to the end: the last roll and blows play as usual, then the
 * defeated side fades, the outcome appears between the portraits, and the window fades out
 * before the story continues. A failed save keeps the window with a Continue button.
 */
function CombatWindow({
  ending,
  bundle,
  director,
  state,
  presentation,
}: Pick<GamePanelProps, "bundle" | "director" | "state" | "presentation"> & {
  ending?: CombatOutcome;
}) {
  useModalPause(presentation);
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<"fighting" | "ended" | "closing">("fighting");
  const ended = useCallback(() => setPhase("ended"), []);
  const finish = useCallback(
    () => void director.finishEvent(state.occurrenceId!),
    [director, state.occurrenceId],
  );
  useEffect(() => {
    if (phase === "fighting" || state.failure) return;
    if (phase === "ended") {
      const timer = setTimeout(() => setPhase("closing"), ENDING_HOLD_MS);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(finish, reduced ? 0 : CLOSING_MS);
    return () => clearTimeout(timer);
  }, [phase, state.failure, reduced, finish]);
  return (
    <ReaderModal
      className={`reader-combat-modal${ending ? " combat-ending" : ""}${phase === "closing" ? " combat-closing" : ""}`}
      title={t("combat.title")}
      closeLabel={t("combat.continue")}
      onDismiss={ending && state.failure ? finish : undefined}
    >
      <CombatControls
        bundle={bundle}
        director={director}
        state={state}
        presentation={presentation}
        ending={ending}
        onEnded={ended}
      />
      {ending && state.failure && <p role="alert">{t("combat.saveFailed")}</p>}
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
