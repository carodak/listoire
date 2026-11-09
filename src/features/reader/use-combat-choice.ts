import { useState } from "react";
import type { Frame, StoryBundle } from "../../contracts/story.ts";
import type { ReaderController, ReaderSnapshot } from "../../contracts/story.ts";

export function useCombatChoice(
  { bundle, director }: { bundle: StoryBundle; director: ReaderController },
  state: ReaderSnapshot & { frame: Frame },
  locked: boolean,
) {
  const [combatReady, setCombatReady] = useState(false);
  const choicesDisabled =
    state.busy ||
    locked ||
    Boolean(
      state.game?.pendingCheck || state.game?.pendingEvent || (state.game?.combat && combatReady),
    );
  const choose = (id: string) => {
    if (choicesDisabled) return;
    if (state.game?.combat) {
      if (id === state.game.combat.choiceId) setCombatReady(true);
      return;
    }
    const action = bundle.game?.actions.find(
      (action) => action.id === state.frame.choices.find((choice) => choice.id === id)?.gameAction,
    );
    if (action?.kind === "combat") setCombatReady(true);
    void director.choose(id, state.occurrenceId!);
  };
  const resumeCombat =
    state.game?.combat && !combatReady ? () => choose(state.game!.combat!.choiceId) : undefined;
  return { combatReady, choose, choicesDisabled, resumeCombat };
}
