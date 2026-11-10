import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { GameMove, GameState } from "../../contracts/game.ts";
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

type Combat = NonNullable<GameState["combat"]>;
export type CombatOutcome = NonNullable<NonNullable<GameState["lastResult"]>["outcome"]>;

interface ControlsProps {
  bundle: StoryBundle;
  director: ReaderController;
  state: ReaderSnapshot;
  presentation?: PresentationSession;
  /** How the fight ended, once it has; the window plays the last turn, then announces it. */
  ending?: CombatOutcome;
  onEnded?: () => void;
}

export function CombatControls(props: ControlsProps) {
  const { bundle, state, presentation, ending, onEnded } = props;
  const surface = useRef<HTMLFieldSetElement>(null);
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const turn = useCombatTurn(props);
  useCombatFeedback(surface, state.game?.lastResult);
  const { combat, log, ended } = turn;
  useEffect(() => {
    if (ended) onEnded?.();
  }, [ended, onEnded]);
  if (!state.character || !state.occurrenceId) return null;
  return (
    <fieldset
      ref={surface}
      className="combat-controls"
      disabled={state.busy || turn.waiting || Boolean(ending)}
    >
      <legend className="sr-only">{t("combat.actions")}</legend>
      <CombatStage
        {...{ bundle, state, combat, presentation, log, ending, ended }}
        hits={!reduced}
        defeated={ending === "victory" || ending === "charmed" ? "enemy" : "player"}
        onSettled={turn.settled}
      />
      {!ending && (
        <CombatActions bundle={bundle} options={state.combatOptions} perform={turn.perform} />
      )}
    </fieldset>
  );
}

/** The encounter on screen, its log in beats, and moves that wait for the dice and the beats. */
function useCombatTurn({ bundle, director, state, ending }: ControlsProps) {
  const [rolling, setRolling] = useState(false);
  const settled = useCallback(() => setRolling(false), []);
  const { game, occurrenceId } = state;
  const { t } = useTranslation();
  // The rules delete a finished encounter: the ending keeps showing the last one.
  const [last, setLast] = useState<Combat | undefined>(game?.combat);
  if (game?.combat && game.combat !== last) setLast(game.combat);
  const combat = game?.combat ?? last;
  const items = bundle.game?.items;
  const itemName = useCallback(
    (id: string) => items?.find((item) => item.id === id)?.name ?? id,
    [items],
  );
  // Turn 1 still shows the result of the choice that started the fight.
  const log = useCombatLog(
    (combat?.turn ?? 0) > 1 || ending ? game?.lastResult : undefined,
    !rolling,
    t,
    itemName,
  );
  const waiting = rolling || log.busy;
  const perform = (move: GameMove) => {
    if (waiting || state.busy || !occurrenceId) return;
    const before = director.getSnapshot().game?.lastResult;
    setRolling(move.kind !== "item");
    void director.gameTurn(move, occurrenceId).then(() => {
      const after = director.getSnapshot();
      // A refused turn (busy, stale page) leaves the result unchanged: nothing will roll.
      if (after.failure || after.game?.lastResult === before) setRolling(false);
    });
  };
  const ended = Boolean(ending) && !waiting && log.lines.length > 0;
  return { combat, log, waiting, ended, perform, settled };
}

/** Portraits, turn, effects, log and dice; at the end, the outcome between the portraits. */
interface StageProps {
  bundle: StoryBundle;
  state: ReaderSnapshot;
  combat?: Combat;
  presentation?: PresentationSession;
  log: ReturnType<typeof useCombatLog>;
  /** Hit effects play (no reduced motion). */
  hits: boolean;
  ending?: CombatOutcome;
  ended: boolean;
  defeated: "enemy" | "player";
  onSettled: () => void;
}

function CombatStage({ bundle, state, combat, log, hits, ending, ended, ...props }: StageProps) {
  const { t } = useTranslation();
  return (
    <div className="combat-stage">
      {combat && (
        <CombatSummary
          bundle={bundle}
          state={state}
          combat={combat}
          presentation={props.presentation}
          enemyHit={hits ? log.enemyHits || undefined : undefined}
          playerHit={hits ? log.playerHits || undefined : undefined}
          shown={log}
          ending={ended ? ending : undefined}
          defeated={ended ? props.defeated : undefined}
        />
      )}
      {!combat && ended && ending && (
        <p className="combat-ending-title" data-outcome={ending} role="status">
          {t(`combat.outcome.${ending}`)}
        </p>
      )}
      <div className="combat-round">
        <div className="combat-readout">
          {combat && <p className="combat-turn">{t("combat.turn", { turn: combat.turn })}</p>}
          {combat && !ending && <CombatEffects effects={combat.effects} />}
          <CombatLog lines={log.lines} />
        </div>
        {((combat?.turn ?? 0) > 1 || ending) && (
          <DiceRoll
            key={ending ? "ending" : combat?.turn}
            result={state.game?.lastResult}
            french={bundle.locale.startsWith("fr")}
            instant={state.restored}
            onSettled={props.onSettled}
          />
        )}
      </div>
      {state.failure && !ending && <p role="alert">{t("combat.unavailable")}</p>}
    </div>
  );
}

/** A fixed-height log that scrolls; the newest entry is always in view. */
function CombatLog({ lines }: { lines: string[] }) {
  const { t } = useTranslation();
  const list = useRef<HTMLOListElement>(null);
  useLayoutEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [lines.length]);
  return (
    <ol
      ref={list}
      className="combat-feedback combat-log"
      aria-label={t("combat.log")}
      aria-live="polite"
      tabIndex={0}
    >
      {lines.map((line, index) => (
        <li key={index}>{line}</li>
      ))}
    </ol>
  );
}

interface SummaryProps {
  bundle: StoryBundle;
  state: ReaderSnapshot;
  combat: Combat;
  presentation?: PresentationSession;
  /** Change per landed blow to replay its effect; undefined under reduced motion. */
  enemyHit?: number;
  playerHit?: number;
  shown: Pick<ReturnType<typeof useCombatLog>, "acted" | "answered">;
  ending?: CombatOutcome;
  defeated?: "enemy" | "player";
}

/** The two portraits; at the end, the outcome appears between them. */
function CombatSummary(props: SummaryProps) {
  const { bundle, state, combat, presentation, ending, defeated, shown } = props;
  const { t } = useTranslation();
  const character = state.character!;
  const result = state.game?.lastResult;
  const encounter = bundle.game?.encounters.find((entry) => entry.id === combat.encounterId);
  // The rules apply both blows at once; each bar moves when its beat is shown. The final blow
  // of a fight is not in the deleted encounter, so it is subtracted here.
  const enemyNow = state.game?.combat ? combat.hp : Math.max(0, combat.hp - (result?.dealt ?? 0));
  const enemyHp = result && shown.acted !== result ? enemyNow + (result.dealt ?? 0) : enemyNow;
  const playerHp =
    result && shown.answered !== result
      ? Math.min(character.health.max, character.health.current + (result.received ?? 0))
      : character.health.current;
  return (
    <div className="combat-summary" data-ending={ending}>
      <Combatant
        side="enemy"
        hit={props.enemyHit}
        defeated={defeated === "enemy"}
        bundle={bundle}
        presentation={presentation}
        label={t("combat.opponent")}
        name={encounter?.name ?? ""}
        portrait={encounter?.portrait}
        health={Math.min(combat.maxHp, enemyHp)}
        maximum={combat.maxHp}
        stats={t("combat.damage", { count: combat.damage })}
      />
      {ending && (
        <p className="combat-ending-title" data-outcome={ending} role="status">
          {t(`combat.outcome.${ending}`)}
        </p>
      )}
      <Combatant
        side="player"
        hit={props.playerHit}
        defeated={defeated === "player"}
        bundle={bundle}
        presentation={presentation}
        label={t("combat.character")}
        name={bundle.character?.name ?? ""}
        portrait={bundle.character?.portrait}
        health={playerHp}
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
