import type { ReactNode } from "react";
import type { StoryBundle } from "../../contracts/story.ts";
import type { PresentationSession } from "../presentation/presentation-session.ts";
import { useAssetSource } from "../presentation/use-asset-source.ts";
import { useSmartCrop } from "../presentation/smart-crop.ts";

/** Without a presentation session there is nothing to resolve media through. */
const unresolved = () => Promise.reject(new Error("No presentation session"));

export function Combatant({
  label,
  name,
  health,
  maximum,
  stats,
  portrait,
  bundle,
  presentation,
  hit,
}: {
  label: string;
  name: string;
  health: number;
  maximum: number;
  stats: ReactNode;
  portrait?: string;
  bundle: StoryBundle;
  presentation?: PresentationSession;
  /** Changes per landed blow to replay the slash and flash. */
  hit?: number;
}) {
  const asset = bundle.assets?.find((asset) => asset.id === portrait);
  const source = useAssetSource(asset, presentation?.resolveAsset ?? unresolved);
  const cropped = useSmartCrop(source || undefined, true);
  return (
    <section className="combatant">
      <div className="combatant-portrait">
        {cropped && <img className="themed-art" src={cropped} alt={name} />}
        {hit !== undefined && <span key={hit} className="combatant-hit" aria-hidden="true" />}
      </div>
      <span className="combatant-label">{label}</span>
      <strong className="combatant-name">{name}</strong>
      <small className="combatant-stats">{stats}</small>
      <div className="combat-vital">
        <strong>
          {health} / {maximum} {bundle.locale === "fr" ? "PV" : "HP"}
        </strong>
        <progress max={maximum} value={health} aria-label={label} />
      </div>
    </section>
  );
}
