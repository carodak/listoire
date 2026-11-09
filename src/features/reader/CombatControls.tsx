import { useCallback, useRef, useState } from "react";
import type { GameMove } from "../../contracts/game.ts";
import type { StoryBundle } from "../../contracts/story.ts";
import type { ReaderController, ReaderSnapshot } from "../../contracts/story.ts";
import { useCombatFeedback } from "../presentation/use-combat-feedback.ts";
import { CombatActions } from "./CombatActions.tsx";
import { Combatant } from "./Combatant.tsx";
import type { PresentationSession } from "../presentation/presentation-session.ts";
import { DiceRoll } from "./DiceRoll.tsx";

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
  useCombatFeedback(surface, character?.health.current, game?.lastResult);
  if (!game?.combat || !character || !occurrenceId) return null;
  const french = bundle.locale.startsWith("fr");
  const perform = (move: GameMove) => {
    if (rolling || state.busy) return;
    setRolling(move.kind !== "item");
    void director.gameTurn(move, occurrenceId).then(() => {
      if (director.getSnapshot().failure) setRolling(false);
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
          rolling={rolling}
          onSettled={finishDice}
        />
      </div>
      <CombatActions bundle={bundle} options={state.combatOptions} perform={perform} />
    </fieldset>
  );
}

type Snapshot = ReaderSnapshot;
function CombatStatus({
  bundle,
  state,
  rolling,
  onSettled,
  presentation,
}: {
  bundle: StoryBundle;
  state: Snapshot;
  rolling: boolean;
  onSettled: () => void;
  presentation?: PresentationSession;
}) {
  const combat = state.game!.combat!;
  const character = state.character!;
  const game = state.game!;
  const french = bundle.locale.startsWith("fr");
  return (
    <>
      <div className="combat-summary">
        <Combatant
          bundle={bundle}
          presentation={presentation}
          label={french ? "Adversaire" : "Opponent"}
          name={
            bundle.game?.encounters.find((entry) => entry.id === combat.encounterId)?.name ?? ""
          }
          portrait={
            bundle.game?.encounters.find((entry) => entry.id === combat.encounterId)?.portrait
          }
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
      <div className="combat-round">
        <div className="combat-readout">
          <p className="combat-turn">
            {french ? "Tour" : "Turn"} {combat.turn}
          </p>
          {combat.effects.length > 0 && (
            <p className="combat-effects">
              {combat.effects.map((effect) => `${effect.kind} (${effect.turns})`).join(" · ")}
            </p>
          )}
          {game.lastResult && combat.turn > 1 && !rolling && (
            <p className="combat-feedback" role="status">
              {game.lastResult.message}
            </p>
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
