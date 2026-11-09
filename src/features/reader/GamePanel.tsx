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
import { SpellFeedback } from "../presentation/SpellFeedback.tsx";
import { useTranslation } from "react-i18next";
import { combatLines } from "./combat-log.ts";

interface GamePanelProps {
  bundle: StoryBundle;
  director: ReaderController;
  state: ReaderSnapshot & { frame: Frame };
  seenResults?: WeakSet<object>;
  presentation?: PresentationSession;
  combatReady?: boolean;
}

export function GamePanel({
  bundle,
  director,
  state,
  seenResults,
  presentation,
  combatReady = false,
}: GamePanelProps) {
  if (!state.game || !state.character || !state.occurrenceId) return null;
  const active = { ...state, game: state.game, occurrenceId: state.occurrenceId };
  const victory = isVictory(state.game);
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
      {victory && (
        <CombatVictory
          bundle={bundle}
          director={director}
          state={state}
          presentation={presentation}
        />
      )}
      <GameNotifications
        bundle={bundle}
        state={state}
        director={director}
        seenResults={seenResults}
        presentation={presentation}
      />
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
/** A won encounter waits on its story event; the combat window announces it. */
function isVictory(game: ReaderSnapshot["game"]) {
  return Boolean(game?.pendingEvent && game.lastResult?.outcome === "victory");
}

/** Time to read "Victory!" and the last blow before the story moves on. */
const VICTORY_HOLD_MS = 2000;

function CombatVictory({
  bundle,
  director,
  state,
  presentation,
}: Pick<GamePanelProps, "bundle" | "director" | "state" | "presentation">) {
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
    const timer = setTimeout(finish, VICTORY_HOLD_MS);
    return () => clearTimeout(timer);
  }, [settled, state.failure, finish]);
  return (
    <ReaderModal
      className="reader-combat-modal combat-victory"
      title={t("combat.title")}
      closeLabel={t("combat.continue")}
      onDismiss={state.failure ? finish : undefined}
    >
      <p className="combat-victory-title" role="status">
        {t("combat.victory")}
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

function GameNotifications({ bundle, director, state, seenResults, presentation }: GamePanelProps) {
  const [dismissed, setDismissed] = useState<object | null>(null);
  const game = state.game;
  const result = game?.lastResult;
  if (
    !result ||
    game?.combat ||
    game?.pendingCheck ||
    (state.restored && !game?.pendingEvent) ||
    result === dismissed ||
    seenResults?.has(result) ||
    isVictory(game)
  )
    return null;
  const received = bundle.game?.items.find((item) => item.id === result.itemId);
  return (
    <GameResultNotice
      bundle={bundle}
      result={result}
      received={received}
      presentation={presentation}
      dismiss={() => {
        if (game?.pendingEvent) {
          setDismissed(result);
          void director.finishEvent(state.occurrenceId!).then(() => {
            if (director.getSnapshot().failure) setDismissed(null);
          });
        } else {
          seenResults?.add(result);
          setDismissed(result);
        }
      }}
    />
  );
}

function GameResultNotice({
  bundle,
  result,
  received,
  presentation,
  dismiss,
}: {
  bundle: StoryBundle;
  result: NonNullable<NonNullable<ReaderSnapshot["game"]>["lastResult"]>;
  received?: NonNullable<StoryBundle["game"]>["items"][number];
  presentation?: PresentationSession;
  dismiss: () => void;
}) {
  const french = bundle.locale.startsWith("fr");
  const [settled, setSettled] = useState(!result.dice?.length);
  const finishDice = useCallback(() => setSettled(true), []);
  useModalPause(presentation);
  const labels = french
    ? {
        event: "Événement",
        item: "Objet reçu",
        adventure: "Votre aventure",
        continue: "Continuer la lecture",
        inventory: "Retrouvez cet objet dans votre inventaire.",
      }
    : {
        event: "Story update",
        item: "Item received",
        adventure: "Your adventure",
        continue: "Continue reading",
        inventory: "You can find this item in your inventory.",
      };
  return (
    <ReaderModal
      title={received?.name ?? labels.event}
      eyebrow={received ? labels.item : labels.adventure}
      closeLabel={labels.continue}
      onDismiss={settled ? dismiss : undefined}
      className={result.abilityId ? "spell-learned-modal" : undefined}
    >
      <SpellFeedback ability={result.abilityId} />
      {settled && (
        <p className="reader-event-message" role="status">
          {result.message}
        </p>
      )}
      <DiceRoll result={result} french={french} onSettled={finishDice} />
      {received && <p className="reader-event-detail">{labels.inventory}</p>}
    </ReaderModal>
  );
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
