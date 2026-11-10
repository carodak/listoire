import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { GameState } from "../../contracts/game.ts";
import { lightningElement } from "./lightning.ts";

/** Feedback follows committed results; it never rolls dice or changes the game. */
export function useCombatFeedback(
  target: RefObject<HTMLElement | null>,
  result: GameState["lastResult"],
) {
  const previous = useRef(result);
  useEffect(() => {
    const before = previous.current;
    previous.current = result;
    const canvas = target.current;
    if (!canvas || result === before || !result?.dice?.length) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // A blow received now shakes the reader's portrait in its own beat (Combatant).
    const board = canvas.closest("dialog") ?? canvas;
    const viewport = document.createElement("div");
    viewport.className = "reader-viewport-feedback";
    if (result.abilityUsed) {
      viewport.classList.add("spell-cast-effect");
      viewport.append(lightningElement());
    }
    viewport.setAttribute("aria-hidden", "true");
    if (!reduced) board.append(viewport);
    const pulse = reduced ? undefined : playCombatPulse(viewport, result);
    return () => {
      pulse?.cancel();
      viewport.remove();
    };
  }, [target, result]);
}

function playCombatPulse(viewport: HTMLElement, result: NonNullable<GameState["lastResult"]>) {
  return viewport.animate(
    [
      { boxShadow: "inset 0 0 0 0 transparent" },
      {
        boxShadow: `inset 0 0 0 2px ${result.success ? "#b99a52" : "#ad6254"}, inset 0 0 55px ${result.success ? "#b99a5266" : "#ad625466"}`,
      },
      { boxShadow: "inset 0 0 0 0 transparent" },
    ],
    { duration: result.abilityUsed ? 2700 : 550, delay: result.abilityUsed ? 0 : 650 },
  );
}
