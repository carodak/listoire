import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CharacterProfile } from "../../contracts/character.ts";
import type { Frame, StoryBundle } from "../../contracts/story.ts";
import "./character.css";

type Popup = "inventory" | "encounters" | "abilities";
export function CharacterPanel({
  bundle,
  frame,
  profile,
  open,
  onToggle,
}: {
  bundle: StoryBundle;
  frame: Frame;
  profile: CharacterProfile | null;
  open: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const [popup, setPopup] = useState<Popup | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const definition = bundle.character;
  if (!definition || !profile) return null;
  const portrait = bundle.assets?.find((asset) => asset.id === definition.portrait);
  const inventory = definition.inventory.filter((item) => frame.facts?.[item.fact] === true);
  const encounters = definition.encounters.filter((person) => frame.facts?.[person.fact] === true);
  return (
    <aside className="character-panel" data-open={open} aria-label={t("myCharacter")}>
      <button
        className="character-tab"
        aria-expanded={open}
        aria-controls="character-content"
        onClick={onToggle}
      >
        <span aria-hidden="true">{open ? "▾" : "▸"}</span> {t("myCharacter")}
      </button>
      <div id="character-content" hidden={!open}>
        {open && (
          <>
            {portrait && (
              <img
                className="character-portrait"
                src={`${import.meta.env.BASE_URL}stories/${bundle.storyId}/${portrait.path}`}
                alt={portrait.alt}
              />
            )}
            <dl className="character-stats">
              <div>
                <dt>{t("health")}</dt>
                <dd>
                  {profile.health.current}/{profile.health.max}
                </dd>
              </div>
              {(["STR", "DEX", "WIL"] as const).map((attribute) => (
                <div key={attribute}>
                  <dt>{attribute}</dt>
                  <dd>{profile.attributes[attribute].current}</dd>
                </div>
              ))}
            </dl>
            {(["inventory", "encounters", "abilities"] as const).map((kind) => (
              <button
                className="character-link"
                key={kind}
                onClick={(event) => {
                  opener.current = event.currentTarget;
                  setPopup(kind);
                }}
              >
                {t(kind)}{" "}
                <span>
                  {kind === "inventory"
                    ? inventory.length
                    : kind === "encounters"
                      ? encounters.length
                      : profile.abilities.length}
                </span>
              </button>
            ))}
          </>
        )}
      </div>
      {popup && (
        <CharacterPopup
          title={t(popup)}
          onClose={() => {
            setPopup(null);
            opener.current?.focus();
          }}
        >
          {popup === "inventory" && (
            <>
              {inventory.map((item) => (
                <section key={item.id}>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                </section>
              ))}
              {!inventory.length && <p>{t("nothingFound")}</p>}
            </>
          )}
          {popup === "encounters" && (
            <>
              {encounters.map((person) => (
                <Encounter key={person.id} person={person} />
              ))}
              {!encounters.length && <p>{t("noEncounters")}</p>}
            </>
          )}
          {popup === "abilities" &&
            profile.abilities.map((ability) => {
              const details = definition.abilities.find((entry) => entry.id === ability.id)!;
              return (
                <section key={ability.id}>
                  <h3>
                    {details.name}{" "}
                    <small>
                      {t("rank")} {ability.rank}
                    </small>
                  </h3>
                  <p>{details.description}</p>
                </section>
              );
            })}
        </CharacterPopup>
      )}
    </aside>
  );
}

function CharacterPopup({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="character-dialog"
      aria-label={title}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialog.current?.close();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button onClick={() => dialog.current?.close()}>{t("close")}</button>
      </header>
      {children}
    </dialog>
  );
}

function Encounter({ person }: { person: { id: string; name: string; description: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="encounter-card" data-open={open}>
      <button
        aria-describedby={`encounter-${person.id}`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {person.name}
      </button>
      <p className="encounter-description" id={`encounter-${person.id}`}>
        {person.description}
      </p>
    </section>
  );
}
