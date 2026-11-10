import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { GameState } from "../../contracts/game.ts";
import { useReducedMotion } from "../../shared/use-reduced-motion.ts";

type Effect = NonNullable<GameState["combat"]>["effects"][number];

/** Effects present before a turn and gone after it (expired or replaced). */
export function endedEffects(before: Effect[], after: Effect[]) {
  return before.filter((effect) => !after.some((now) => now.ability === effect.ability));
}

/** Active effects; one that ends fades out (CSS) instead of vanishing, except under reduced motion. */
export function CombatEffects({ effects }: { effects: Effect[] }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [ended, setEnded] = useState<Effect[]>([]);
  const previous = useRef(effects);
  useEffect(() => {
    const before = previous.current;
    previous.current = effects;
    const fresh = endedEffects(before, effects);
    setEnded((fading) => {
      if (reduced) return fading.length ? [] : fading;
      // Still fading (unless active again), plus the ones that just ended.
      const next = [...endedEffects(fading, effects), ...endedEffects(fresh, fading)];
      return next.length === fading.length && next.every((effect, i) => effect === fading[i])
        ? fading
        : next;
    });
  }, [effects, reduced]);
  if (!effects.length && !ended.length) return null;
  const label = (effect: Effect) => t(`combat.effect.${effect.kind}`, { count: effect.turns });
  return (
    <p className="combat-effects">
      {ended.map((effect) => (
        <span
          key={`ended-${effect.ability}`}
          className="combat-effect combat-effect-ended"
          aria-hidden="true"
          onAnimationEnd={() => setEnded((fading) => fading.filter((item) => item !== effect))}
        >
          {label(effect)}
        </span>
      ))}
      {effects.map((effect) => (
        <span key={effect.ability} className="combat-effect">
          {label(effect)}
        </span>
      ))}
    </p>
  );
}
