import { useState } from "react";
import type { CombatOption, GameMove } from "../../contracts/game.ts";
import type { StoryBundle } from "../../contracts/story.ts";
import { Info } from "../../shared/Info.tsx";
import { CombatOptionDetails, chanceLabel } from "./CombatOptionDetails.tsx";

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
  const french = bundle.locale === "fr";
  const labels = french
    ? {
        attack: "Attaque simple",
        ability: "Utiliser une capacité",
        item: "Utiliser un objet",
        flee: "Fuir",
      }
    : { attack: "Basic attack", ability: "Use an ability", item: "Use an item", flee: "Flee" };
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
                {labels[kind]}
              </button>
              <Info label={`${french ? "Détails" : "Details"} · ${labels[kind]}`}>
                {!available.length ? (
                  <p>
                    {french
                      ? "Aucun choix disponible dans votre inventaire ou vos capacités."
                      : "No available item or ability."}
                  </p>
                ) : (
                  available.map((option, index) => (
                    <CombatOptionDetails
                      key={index}
                      option={option}
                      name={optionName(bundle, option)}
                      french={french}
                    />
                  ))
                )}
              </Info>
            </div>
          );
        })}
      </div>
      {open && (
        <div className="combat-ability-menu" aria-label={labels[open]}>
          {options
            .filter((option) => option.move.kind === open)
            .map((option) => {
              const move = option.move;
              if (move.kind !== "ability" && move.kind !== "item") return null;
              const definition =
                move.kind === "ability" ? bundle.game?.abilities : bundle.game?.items;
              return (
                <div key={move.id} className="combat-action">
                  <button onClick={() => choose(move)}>
                    {definition?.find((entry) => entry.id === move.id)?.name ?? move.id}
                    <small>{chanceLabel(option.probability, french)}</small>
                  </button>
                  <Info
                    label={`${french ? "Détails" : "Details"} · ${definition?.find((entry) => entry.id === move.id)?.name ?? move.id}`}
                  >
                    <CombatOptionDetails
                      option={option}
                      name={optionName(bundle, option)}
                      french={french}
                    />
                  </Info>
                </div>
              );
            })}
        </div>
      )}
    </>
  );
}

function optionName(bundle: StoryBundle, option: CombatOption) {
  const move = option.move;
  if (move.kind !== "ability" && move.kind !== "item") return undefined;
  const entries = move.kind === "ability" ? bundle.game?.abilities : bundle.game?.items;
  return entries?.find((entry) => entry.id === move.id)?.name;
}
