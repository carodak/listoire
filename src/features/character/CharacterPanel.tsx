import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { CharacterProfile } from "../../contracts/character.ts";
import type { Frame, StoryBundle } from "../../contracts/story.ts";
import type { GameState } from "../../contracts/game.ts";
import type { ReaderNotesPort } from "../../contracts/reader-notes.ts";
import "./character.css";

type Tab = "inventory" | "abilities" | "encounters" | "notes";
interface Props {
  bundle: StoryBundle;
  frame: Frame;
  profile: CharacterProfile | null;
  game?: GameState | null;
  inventoryControls?: ReactNode;
  notes?: ReaderNotesPort;
  open: boolean;
  onToggle: () => void;
}
export function CharacterPanel(props: Props) {
  const { bundle, frame, profile, game, open, onToggle } = props;
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab | null>(null);
  const definition = bundle.character;
  if (!definition || !profile) return null;
  const portrait = bundle.assets?.find((asset) => asset.id === definition.portrait);
  const inventory = [
    ...definition.inventory.filter((item) => frame.facts?.[item.fact] === true),
    ...(game?.inventory ?? [])
      .map((id) => bundle.game?.items.find((item) => item.id === id))
      .filter((item) => item !== undefined),
  ];
  const encounters = definition.encounters.filter((person) => frame.facts?.[person.fact] === true);
  const counts = {
    inventory: new Set(inventory.map((item) => item.id)).size,
    abilities: profile.abilities.length,
    encounters: encounters.length,
    notes: undefined,
  };
  return (
    <div className="character-panel">
      <button
        className="character-tab"
        aria-expanded={open}
        aria-controls="character-content"
        onClick={onToggle}
      >
        {t("myCharacter")}
      </button>
      {open && (
        <aside id="character-content" className="reader-sidebar" aria-label={t("myCharacter")}>
          <header>
            <h2>{t("myCharacter")}</h2>
            <button onClick={onToggle} aria-label={t("close")}>
              ›
            </button>
          </header>
          {portrait && (
            <img
              className="character-portrait"
              src={`${import.meta.env.BASE_URL}stories/${bundle.storyId}/${portrait.path}`}
              alt={portrait.alt}
            />
          )}
          <CharacterStats profile={profile} />
          {(["inventory", "abilities", "encounters", "notes"] as const).map((kind) => (
            <button
              className="character-link"
              key={kind}
              aria-pressed={tab === kind}
              onClick={() => setTab(tab === kind ? null : kind)}
            >
              {t(kind)} <span>{counts[kind]} ↗</span>
            </button>
          ))}
          {tab && (
            <section className="character-tab-content" aria-label={t(tab)}>
              <h3>{t(tab)}</h3>
              {tab === "inventory" && (
                <>
                  {inventory
                    .filter((item) => !game?.inventory.includes(item.id))
                    .map((item) => (
                      <section key={item.id}>
                        <h4>{item.name}</h4>
                        {"description" in item && <p>{String(item.description)}</p>}
                      </section>
                    ))}
                  {props.inventoryControls}
                  {!inventory.length && <p>{t("nothingFound")}</p>}
                </>
              )}
              {tab === "encounters" && (
                <>
                  {encounters.map((person) => (
                    <Encounter key={person.id} person={person} />
                  ))}
                  {!encounters.length && <p>{t("noEncounters")}</p>}
                </>
              )}
              {tab === "abilities" &&
                profile.abilities.map((ability) => {
                  const details =
                    definition.abilities.find((item) => item.id === ability.id) ??
                    bundle.game?.abilities.find((item) => item.id === ability.id);
                  return (
                    <section key={ability.id}>
                      <h4>
                        {details?.name ?? ability.id}{" "}
                        <small>
                          {t("rank")} {ability.rank}
                        </small>
                      </h4>
                      <p>{details?.description}</p>
                    </section>
                  );
                })}
              {tab === "notes" && <ReaderNotes port={props.notes} />}
            </section>
          )}
        </aside>
      )}
    </div>
  );
}
function CharacterStats({ profile }: { profile: CharacterProfile }) {
  const { t } = useTranslation();
  return (
    <dl className="character-stats">
      <div>
        <dt>♥ {t("health")}</dt>
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
  );
}
function ReaderNotes({ port }: { port?: ReaderNotesPort }) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void (port?.read() ?? Promise.resolve(""))
      .then((value) => {
        if (active) {
          setText(value);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) setError(t("notesLoadError"));
      });
    return () => {
      active = false;
    };
  }, [port, t]);
  return (
    <>
      <label>
        {t("personalNotes")}
        <textarea
          aria-label={t("personalNotes")}
          maxLength={20000}
          disabled={!ready}
          value={text}
          onChange={(event) => {
            const value = event.target.value;
            setText(value);
            void port?.write(value).catch(() => setError(t("notesSaveError")));
          }}
        />
      </label>
      <small>{t("notesHint")}</small>
      {error && <p role="alert">{error}</p>}
    </>
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
