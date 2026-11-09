import { useState } from "react";
import type { CombatOption, GameMove } from "../../contracts/game.ts";
import type { StoryBundle } from "../../contracts/story.ts";
import { Info } from "../../shared/Info.tsx";
import { CombatOptionDetails, chanceLabel, optionName } from "./CombatOptionDetails.tsx";

const COPY = {
  fr: {
    attack: "Attaque simple",
    ability: "Utiliser une capacité",
    item: "Utiliser un objet",
    flee: "Fuir",
    details: "Détails",
    none: "Aucun choix disponible dans votre inventaire ou vos capacités.",
  },
  en: {
    attack: "Basic attack",
    ability: "Use an ability",
    item: "Use an item",
    flee: "Flee",
    details: "Details",
    none: "No available item or ability.",
  },
};
const copyFor = (bundle: StoryBundle) => (bundle.locale === "fr" ? COPY.fr : COPY.en);

export function CombatActions({
  bundle,
  options,
  perform,
}: {
  bundle: StoryBundle;
  options: CombatOption[];
  perform: (move: GameMove) => void;
}) {
  const [open, setOpen] = useState<"ability" | "item" | null>(null);
  const copy = copyFor(bundle);
  const choose = (move: GameMove) => {
    setOpen(null);
    perform(move);
  };
  return (
    <>
      <div className="combat-actions">
        {(["attack", "ability", "item", "flee"] as const).map((kind) => {
          const available = options.filter((option) => option.move.kind === kind);
          const grouped = kind === "ability" || kind === "item";
          return (
            <div className="combat-action" key={kind}>
              <button
                className={kind === "attack" ? "combat-attack" : undefined}
                disabled={!available.length}
                aria-expanded={grouped ? open === kind : undefined}
                onClick={() => (grouped ? setOpen(open === kind ? null : kind) : choose({ kind }))}
              >
                {copy[kind]}
              </button>
              <Info label={`${copy.details} · ${copy[kind]}`}>
                {!available.length ? (
                  <p>{copy.none}</p>
                ) : (
                  available.map((option, index) => (
                    <CombatOptionDetails key={index} bundle={bundle} option={option} />
                  ))
                )}
              </Info>
            </div>
          );
        })}
      </div>
      {open && (
        <CombatMenu
          bundle={bundle}
          label={copy[open]}
          options={options.filter((option) => option.move.kind === open)}
          choose={choose}
        />
      )}
    </>
  );
}

function CombatMenu({
  bundle,
  label,
  options,
  choose,
}: {
  bundle: StoryBundle;
  label: string;
  options: CombatOption[];
  choose: (move: GameMove) => void;
}) {
  return (
    <div className="combat-ability-menu" aria-label={label}>
      {options.map((option) => {
        const move = option.move;
        if (move.kind !== "ability" && move.kind !== "item") return null;
        const name = optionName(bundle, option) ?? move.id;
        return (
          <div key={move.id} className="combat-action">
            <button onClick={() => choose(move)}>
              {name}
              <small>{chanceLabel(option.probability, bundle.locale === "fr")}</small>
            </button>
            <Info label={`${copyFor(bundle).details} · ${name}`}>
              <CombatOptionDetails bundle={bundle} option={option} />
            </Info>
          </div>
        );
      })}
    </div>
  );
}
