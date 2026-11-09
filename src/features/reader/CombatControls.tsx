import { useCallback, useRef, useState } from "react";
import type { GameMove } from "../../contracts/game.ts";
import type { StoryBundle } from "../../contracts/story.ts";
import type { ReaderController, ReaderSnapshot } from "../../contracts/story.ts";
import { useCombatFeedback } from "../presentation/use-combat-feedback.ts";
import { CombatActions } from "./CombatActions.tsx";
import { Combatant } from "./Combatant.tsx";
import type { PresentationSession } from "../presentation/presentation-session.ts";
import { DiceRoll } from "./DiceRoll.tsx";
import { useTranslation } from "react-i18next";
import { useCombatLog } from "./combat-log.ts";
import { useReducedMotion } from "../../shared/use-reduced-motion.ts";
import { CombatEffects } from "./CombatEffects.tsx";

export function CombatControls({
  bundle,
  director,
  state,
  presentation,
}: {
  bundle: StoryBundle;
  director: ReaderController;
  state: ReaderSnapshot;
  presentation?: PresentationSession;
}) {
  const surface = useRef<HTMLFieldSetElement>(null);
  const [rolling, setRolling] = useState(false);
  const finishDice = useCallback(() => setRolling(false), []);
  const { game, character, occurrenceId } = state;
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  useCombatFeedback(surface, character?.health.current, game?.lastResult);
  // Turn 1 still shows the result of the choice that started the fight.
  const items = bundle.game?.items;
  const itemName = useCallback(
    (id: string) => items?.find((item) => item.id === id)?.name ?? id,
    [items],
  );
  const log = useCombatLog(
    (game?.combat?.turn ?? 0) > 1 ? game?.lastResult : undefined,
    !rolling,
    t,
    itemName,
  );
  if (!game?.combat || !character || !occurrenceId) return null;
  const french = bundle.locale.startsWith("fr");
  const perform = (move: GameMove) => {
    if (rolling || state.busy) return;
    const before = director.getSnapshot().game?.lastResult;
    setRolling(move.kind !== "item");
    void director.gameTurn(move, occurrenceId).then(() => {
      const after = director.getSnapshot();
      // A refused turn (busy, stale page) leaves the result unchanged: nothing will roll.
      if (after.failure || after.game?.lastResult === before) setRolling(false);
    });
  };
  return (
    <fieldset ref={surface} className="combat-controls" disabled={state.busy || rolling}>
      <legend className="sr-only">{french ? "Actions de combat" : "Combat actions"}</legend>
      <div className="combat-stage">
        <CombatStatus
          bundle={bundle}
          state={state}
          presentation={presentation}
          onSettled={finishDice}
          log={log.lines}
          hit={reduced ? undefined : log.hits || undefined}
        />
      </div>
      <CombatActions bundle={bundle} options={state.combatOptions} perform={perform} />
    </fieldset>
  );
}

interface StatusProps {
  bundle: StoryBundle;
  state: ReaderSnapshot;
  presentation?: PresentationSession;
  /** Increments per landed blow; undefined disables the hit effect (reduced motion). */
  hit?: number;
}

function CombatStatus({
  onSettled,
  log,
  ...props
}: StatusProps & { onSettled: () => void; log: string[] }) {
  const { bundle, state } = props;
  const { t } = useTranslation();
  const combat = state.game!.combat!;
  const game = state.game!;
  const french = bundle.locale.startsWith("fr");
  return (
    <>
      <CombatSummary {...props} />
      <div className="combat-round">
        <div className="combat-readout">
          <p className="combat-turn">
            {french ? "Tour" : "Turn"} {combat.turn}
          </p>
          <CombatEffects effects={combat.effects} />
          {log.length > 0 && (
            <ol
              className="combat-feedback combat-log"
              aria-label={t("combat.log")}
              aria-live="polite"
            >
              {log.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ol>
          )}
        </div>
        {combat.turn > 1 && (
          <DiceRoll
            key={combat.turn}
            result={game.lastResult}
            french={french}
            instant={state.restored}
            onSettled={onSettled}
          />
        )}
      </div>
      {state.failure && (
        <p role="alert">
          {french ? "Action indisponible. Réessayez." : "Action unavailable. Please retry."}
        </p>
      )}
    </>
  );
}

function CombatSummary({ bundle, state, presentation, hit }: StatusProps) {
  const combat = state.game!.combat!;
  const character = state.character!;
  const french = bundle.locale.startsWith("fr");
  const encounter = bundle.game?.encounters.find((entry) => entry.id === combat.encounterId);
  return (
    <div className="combat-summary">
      <Combatant
        hit={hit}
        bundle={bundle}
        presentation={presentation}
        label={french ? "Adversaire" : "Opponent"}
        name={encounter?.name ?? ""}
        portrait={encounter?.portrait}
        health={combat.hp}
        maximum={combat.maxHp}
        stats={
          <>
            {french ? "Dégâts" : "Damage"} {combat.damage}
          </>
        }
      />
      <Combatant
        bundle={bundle}
        presentation={presentation}
        label={french ? "Personnage" : "Character"}
        name={bundle.character?.name ?? ""}
        portrait={bundle.character?.portrait}
        health={character.health.current}
        maximum={character.health.max}
        stats={(["STR", "DEX", "WIL"] as const)
          .map(
            (key) =>
              `${key} ${state.attributeDetails?.[key].total ?? character.attributes[key].current}`,
          )
          .join(" / ")}
      />
    </div>
  );
}
