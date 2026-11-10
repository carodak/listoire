import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import type { CombatOption, GameMove } from "../../contracts/game.ts";
import type { StoryBundle } from "../../contracts/story.ts";
import { Info } from "../../shared/Info.tsx";
import { CloseButton } from "../../shared/CloseButton.tsx";
import { CombatOptionDetails, chanceLabel, optionName } from "./CombatOptionDetails.tsx";

const kinds = ["attack", "ability", "item", "flee"] as const;

export function CombatActions({
  bundle,
  options,
  perform,
}: {
  bundle: StoryBundle;
  options: CombatOption[];
  perform: (move: GameMove) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<"ability" | "item" | null>(null);
  const triggers = useRef<Partial<Record<string, HTMLButtonElement | null>>>({});
  const close = () => {
    triggers.current[open!]?.focus();
    setOpen(null);
  };
  const choose = (move: GameMove) => {
    setOpen(null);
    perform(move);
  };
  return (
    <>
      <div className="combat-actions">
        {kinds.map((kind) => {
          const available = options.filter((option) => option.move.kind === kind);
          const grouped = kind === "ability" || kind === "item";
          const label = t(`combat.move.${kind}`);
          return (
            <div className="combat-action" key={kind}>
              <button
                ref={(button) => {
                  triggers.current[kind] = button;
                }}
                className={kind === "attack" ? "combat-attack" : undefined}
                disabled={!available.length}
                aria-haspopup={grouped ? "dialog" : undefined}
                aria-expanded={grouped ? open === kind : undefined}
                onClick={() => (grouped ? setOpen(open === kind ? null : kind) : choose({ kind }))}
              >
                {label}
              </button>
              <Info label={t("combat.details", { name: label })}>
                {!available.length ? (
                  <p>{t("combat.none")}</p>
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
          label={t(`combat.move.${open}`)}
          options={options.filter((option) => option.move.kind === open)}
          choose={choose}
          close={close}
        />
      )}
    </>
  );
}

/** Abilities or items in a popup inside the combat window; Escape or × returns to the actions. */
function CombatMenu({
  bundle,
  label,
  options,
  choose,
  close,
}: {
  bundle: StoryBundle;
  label: string;
  options: CombatOption[];
  choose: (move: GameMove) => void;
  close: () => void;
}) {
  const { t } = useTranslation();
  const popup = useRef<HTMLDivElement>(null);
  useEffect(() => {
    popup.current?.querySelector<HTMLButtonElement>(".combat-ability-menu button")?.focus();
  }, []);
  const escape = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault(); // keeps the combat window itself open
    event.stopPropagation();
    close();
  };
  return (
    <div ref={popup} className="combat-popup" role="dialog" aria-label={label} onKeyDown={escape}>
      <header>
        <h3>{label}</h3>
        <CloseButton className="combat-popup-close" onClick={close} />
      </header>
      <div className="combat-ability-menu">
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
              <Info label={t("combat.details", { name })}>
                <CombatOptionDetails bundle={bundle} option={option} />
              </Info>
            </div>
          );
        })}
      </div>
    </div>
  );
}
