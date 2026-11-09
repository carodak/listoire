import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { GameState } from "../../contracts/game.ts";
import { EffectsEngine } from "./effects.ts";
import { lightningElement } from "./lightning.ts";

/** Feedback follows committed results; it never rolls dice or changes the game. */
export function useCombatFeedback(
  target: RefObject<HTMLElement | null>,
  health: number | undefined,
  result: GameState["lastResult"],
) {
  const previous = useRef({ health, result });
  useEffect(() => {
    const before = previous.current;
    previous.current = { health, result };
    const canvas = target.current;
    if (!canvas || result === before.result || !result?.dice?.length) return;
    const scope = new AbortController();
    const effects = new EffectsEngine();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (health !== undefined && before.health !== undefined && health < before.health)
      effects.play(
        { id: "screen-shake", duration: 2000, intensity: 0.16, target: "canvas" },
        { canvas: canvas.querySelector<HTMLElement>(".combat-stage") ?? canvas },
        scope.signal,
        reduced,
      );
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
      scope.abort();
      pulse?.cancel();
      viewport.remove();
    };
  }, [target, health, result]);
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
