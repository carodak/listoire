import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { StoryBundle } from "../../contracts/story.ts";
import type { PresentationSession } from "../presentation/presentation-session.ts";
import { useAssetSource } from "../presentation/use-asset-source.ts";
import { useSmartCrop } from "../presentation/smart-crop.ts";

/** Without a presentation session there is nothing to resolve media through. */
const unresolved = () => Promise.reject(new Error("No presentation session"));

/** A blow on the reader's own portrait: a short, strong jolt. */
const SHAKE = [0, -9, 8, -6, 4, -2, 0].map((x) => ({ transform: `translateX(${x}px)` }));

export function Combatant({
  side,
  label,
  name,
  health,
  maximum,
  stats,
  portrait,
  bundle,
  presentation,
  hit,
  defeated = false,
}: {
  side: "enemy" | "player";
  label: string;
  name: string;
  health: number;
  maximum: number;
  stats: ReactNode;
  portrait?: string;
  bundle: StoryBundle;
  presentation?: PresentationSession;
  /** Changes per landed blow to replay its effect (slash + flash on the enemy, flash + shake on you). */
  hit?: number;
  /** The side that lost (or left) fades away when the fight ends. */
  defeated?: boolean;
}) {
  const { t } = useTranslation();
  const asset = bundle.assets?.find((asset) => asset.id === portrait);
  const source = useAssetSource(asset, presentation?.resolveAsset ?? unresolved);
  const cropped = useSmartCrop(source || undefined, true);
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (hit && side === "player") frame.current?.animate?.(SHAKE, { duration: 420 });
  }, [hit, side]);
  return (
    <section className="combatant" data-side={side} data-defeated={defeated || undefined}>
      <div ref={frame} className="combatant-portrait">
        {cropped && <img className="themed-art" src={cropped} alt={name} />}
        {hit !== undefined && <span key={hit} className="combatant-hit" aria-hidden="true" />}
      </div>
      <span className="combatant-label">{label}</span>
      <strong className="combatant-name">{name}</strong>
      <small className="combatant-stats">{stats}</small>
      <div className="combat-vital">
        <strong>
          {health} / {maximum} {t("combat.hp")}
        </strong>
        <progress max={maximum} value={health} aria-label={label} />
      </div>
    </section>
  );
}
