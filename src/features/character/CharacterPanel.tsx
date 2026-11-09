import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { CharacterProfile, AttributeDetails } from "../../contracts/character.ts";
import type { Frame, StoryBundle } from "../../contracts/story.ts";
import type { GameState } from "../../contracts/game.ts";
import type { ReaderNotesPort } from "../../contracts/reader-notes.ts";
import { inventoryCategory } from "./inventory-category.ts";
import type { InventoryCategory } from "./inventory-category.ts";
import { ReaderModal } from "../../shared/ReaderModal.tsx";
import "./character.css";

type Tab = "inventory" | "abilities" | "encounters" | "notes";
const tabIcons: Record<Tab, string> = {
  inventory: "♧",
  abilities: "✧",
  encounters: "♧",
  notes: "▤",
};
type InventoryTab = InventoryCategory;
interface Props {
  bundle: StoryBundle;
  frame: Frame;
  profile: CharacterProfile | null;
  game?: GameState | null;
  attributeDetails?: AttributeDetails | null;
  inventoryControls?: ReactNode;
  notes?: ReaderNotesPort;
  open: boolean;
  onToggle: () => void;
}

/** The normal sheet retains its open/closed state while combat temporarily displays its own copy. */
export function CharacterPanel(props: Props) {
  const { t } = useTranslation();
  if (!props.bundle.character || !props.profile) return null;
  return (
    <div className="character-panel">
      <button
        type="button"
        className="character-tab"
        aria-expanded={props.open}
        aria-controls="character-content"
        title={t("myCharacter")}
        onClick={props.onToggle}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="7" r="3.5" />
          <path d="M5 21v-2a7 7 0 0 1 14 0v2M8 21h8" />
        </svg>
        <span>{t("myCharacter")}</span>
      </button>
      {props.open && (
        <aside
          id="character-content"
          className="reader-sidebar character-sidebar"
          aria-label={t("myCharacter")}
          onKeyDown={(event) => {
            if (event.key === "Escape" && event.target === event.currentTarget) props.onToggle();
          }}
        >
          <CharacterSheet {...props} onClose={props.onToggle} />
        </aside>
      )}
    </div>
  );
}

type SheetProps = Omit<Props, "open" | "onToggle"> & { onClose?: () => void; combat?: boolean };
function CharacterSheet({
  bundle,
  frame,
  profile,
  game,
  attributeDetails,
  inventoryControls,
  notes,
  onClose,
  combat = false,
}: SheetProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab | null>(null);
  const definition = bundle.character;
  if (!definition || !profile) return null;
  const dismissTab = () => setTab(null);
  return (
    <div className={`character-sheet${combat ? " character-sheet-combat" : ""}`}>
      <header className="character-sheet-heading">
        <h2>{t("myCharacter")}</h2>
        {onClose && (
          <button className="character-close" onClick={onClose} aria-label={t("close")}>
            ×
          </button>
        )}
      </header>
      <CharacterIdentity bundle={bundle} xp={combat ? undefined : (game?.xp ?? 0)} />
      <CharacterPortrait bundle={bundle} health={profile.health.current} combat={combat} />
      <CharacterStats profile={profile} details={attributeDetails} showHealth={!combat} />
      {!combat && (
        <nav className="character-actions" aria-label={t("myCharacter")}>
          {(["inventory", "abilities", "encounters", "notes"] as const).map((kind) => (
            <button key={kind} type="button" onClick={() => setTab(kind)}>
              <span aria-hidden="true" className="character-action-icon">
                {tabIcons[kind]}
              </span>
              {t(kind)}
            </button>
          ))}
        </nav>
      )}
      {!combat && (
        <CharacterDetails
          bundle={bundle}
          frame={frame}
          profile={profile}
          game={game}
          notes={notes}
          inventoryControls={inventoryControls}
          tab={tab}
          onDismiss={dismissTab}
        />
      )}
    </div>
  );
}

function CharacterStats({
  profile,
  details,
  showHealth = true,
}: {
  profile: CharacterProfile;
  details?: AttributeDetails | null;
  showHealth?: boolean;
}) {
  const { t } = useTranslation();
  const attributes = ["STR", "DEX", "WIL"] as const;
  return (
    <dl className="character-stats" aria-label={t("myCharacter")}>
      {showHealth && (
        <div title={t("health")}>
          <dt>
            <span aria-hidden="true">♡</span>
            <span className="sr-only">{t("health")}</span>
          </dt>
          <dd>
            {profile.health.current}/{profile.health.max}
          </dd>
        </div>
      )}
      {attributes.map((attribute) => {
        const { base, equipment, total, capped } = details?.[attribute] ?? {
          base: profile.attributes[attribute].current,
          total: profile.attributes[attribute].current,
          equipment: 0,
          capped: false,
        };
        const tooltip = `${attribute} · ${t("baseStat")}: ${base} · ${t("equipmentBonus")}: +${equipment}${capped ? ` · ${t("statCapped")}: 18` : ""}`;
        return (
          <div key={attribute} tabIndex={0} title={tooltip} aria-label={tooltip}>
            <dt>{attribute}</dt>
            <dd>{total}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function ReaderNotesDialog({ port, onDismiss }: { port?: ReaderNotesPort; onDismiss: () => void }) {
  const { t } = useTranslation();
  const { text, edit, dirty, ready, saving, error, notice, save } = useReaderNotes(port);
  const close = () => {
    if (saving) return;
    if (dirty && !window.confirm(t("notesDiscardConfirm"))) return;
    onDismiss();
  };
  return (
    <ReaderModal
      className="character-detail-modal"
      title={t("notes")}
      onDismiss={close}
      closeLabel={t("close")}
      footerActions={
        <button
          className="reader-modal-primary"
          type="button"
          disabled={!dirty || !ready || saving || !port}
          onClick={() => void save()}
        >
          {saving ? t("saving") : t("saveNotes")}
        </button>
      }
    >
      <div className="character-notes">
        <label htmlFor="reader-personal-notes">{t("personalNotes")}</label>
        <textarea
          id="reader-personal-notes"
          maxLength={20000}
          disabled={!ready || !port}
          value={text}
          onChange={(event) => edit(event.target.value)}
        />
        {notice && <p role="status">{notice}</p>}
        {error && <p role="alert">{error}</p>}
      </div>
    </ReaderModal>
  );
}

function useReaderNotes(port: ReaderNotesPort | undefined) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [saved, setSaved] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    void (port?.read() ?? Promise.resolve(""))
      .then((value) => {
        if (active) {
          setText(value);
          setSaved(value);
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
  const dirty = text !== saved;
  const save = async () => {
    if (!port || !ready || saving || !dirty) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await port.write(text);
      setSaved(text);
      setNotice(t("notesSaved"));
    } catch {
      setError(t("notesSaveError"));
    } finally {
      setSaving(false);
    }
  };
  const edit = (value: string) => {
    setText(value);
    setNotice("");
  };
  return { text, edit, dirty, ready, saving, error, notice, save };
}

function Encounter({ person }: { person: { id: string; name: string; description: string } }) {
  return (
    <section className="character-detail-item">
      <h3>{person.name}</h3>
      <p>{person.description}</p>
    </section>
  );
}

function InventoryContents({
  bundle,
  frame,
  game,
  inventoryControls,
}: Pick<SheetProps, "bundle" | "frame" | "game" | "inventoryControls">) {
  const { t } = useTranslation();
  const [inventoryTab, setInventoryTab] = useState<InventoryTab>("objects");
  const definition = bundle.character!;
  const inventory = [
    ...definition.inventory.filter((item) => frame.facts?.[item.fact] === true),
    ...(game?.inventory ?? [])
      .map((id) => bundle.game?.items.find((item) => item.id === id))
      .filter((item) => item !== undefined),
  ];
  return (
    <>
      <InventoryTabs
        label={t("inventory")}
        locale={bundle.locale}
        tab={inventoryTab}
        onTab={setInventoryTab}
      />
      <div role="tabpanel" className="inventory-tab-panel" aria-label={inventoryTab}>
        {inventory
          .filter(
            (item) =>
              !game?.inventory.includes(item.id) && inventoryCategory(item) === inventoryTab,
          )
          .map((item) => (
            <section key={item.id} className="character-detail-item">
              <h3>{item.name}</h3>
              {"description" in item && <p>{String(item.description)}</p>}
            </section>
          ))}
        {inventoryControls && (
          <div className="inventory-controls-slot" data-category={inventoryTab}>
            {inventoryControls}
          </div>
        )}
        {!inventory.some((item) => inventoryCategory(item) === inventoryTab) && (
          <p>{t("nothingFound")}</p>
        )}
      </div>
    </>
  );
}

function InventoryTabs({
  label,
  locale,
  tab,
  onTab,
}: {
  label: string;
  locale: string;
  tab: InventoryTab;
  onTab: (tab: InventoryTab) => void;
}) {
  return (
    <div
      className="inventory-tabs"
      role="tablist"
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const tabs: InventoryTab[] = ["equipment", "consumables", "objects"];
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const next = (tabs.indexOf(tab) + direction + tabs.length) % tabs.length;
        onTab(tabs[next]!);
        event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
      }}
    >
      {(["equipment", "consumables", "objects"] as const).map((kind) => (
        <button
          key={kind}
          type="button"
          role="tab"
          aria-selected={tab === kind}
          tabIndex={tab === kind ? 0 : -1}
          className={tab === kind ? "active" : ""}
          onClick={() => onTab(kind)}
        >
          {locale === "fr"
            ? { equipment: "Équipement", consumables: "Consommables", objects: "Objets" }[kind]
            : { equipment: "Equipment", consumables: "Consumables", objects: "Items" }[kind]}
        </button>
      ))}
    </div>
  );
}

function CharacterPortrait({
  bundle,
  health,
  combat,
}: {
  bundle: StoryBundle;
  health: number;
  combat: boolean;
}) {
  const [damage, setDamage] = useState<{ amount: number; key: number } | null>(null);
  const previousHealth = useRef(health);
  const hitSequence = useRef(0);
  useEffect(() => {
    const hp = health;
    if (
      hp !== undefined &&
      previousHealth.current !== undefined &&
      hp < previousHealth.current &&
      combat
    )
      setDamage({ amount: previousHealth.current - hp, key: ++hitSequence.current });
    previousHealth.current = hp;
  }, [health, combat]);
  useEffect(() => {
    if (!damage) return;
    const timeout = window.setTimeout(() => setDamage(null), 1050);
    return () => window.clearTimeout(timeout);
  }, [damage]);
  const portrait = bundle.assets?.find((asset) => asset.id === bundle.character?.portrait);
  return (
    <div className={`character-portrait-area${damage ? " character-hit" : ""}`}>
      {portrait && (
        <img
          className="character-portrait"
          src={`${import.meta.env.BASE_URL}stories/${bundle.storyId}/${portrait.path}`}
          alt={portrait.alt}
        />
      )}
      {damage && (
        <strong key={damage.key} className="character-damage" aria-live="assertive">
          −{damage.amount}
        </strong>
      )}
    </div>
  );
}

function CharacterIdentity({ bundle, xp }: { bundle: StoryBundle; xp?: number }) {
  const { t } = useTranslation();
  const definition = bundle.character!;
  return (
    <div className="character-identity">
      <h3>{definition.name || (bundle.locale === "fr" ? "Personnage" : "Character")}</h3>
      {xp !== undefined && (
        <div
          className="character-xp-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={5}
          aria-valuenow={xp}
          aria-label={t("xpProgress")}
        >
          <div className="character-xp-fill" style={{ width: `${((xp ?? 0) / 5) * 100}%` }} />
          <span>{xp} / 5 XP</span>
        </div>
      )}
    </div>
  );
}

function CharacterAbilities({
  bundle,
  profile,
}: {
  bundle: StoryBundle;
  profile: CharacterProfile;
}) {
  const { t } = useTranslation();
  return (
    <>
      {profile.abilities.map((ability) => {
        const details =
          bundle.character?.abilities.find((item) => item.id === ability.id) ??
          bundle.game?.abilities.find((item) => item.id === ability.id);
        return (
          <section className="character-detail-item" key={ability.id}>
            <h3>
              {details?.name ?? ability.id}{" "}
              <small>
                {t("rank")} {ability.rank}
              </small>
            </h3>
            <p>{details?.description}</p>
          </section>
        );
      })}
    </>
  );
}

function KnownEncounters({ bundle, frame }: Pick<SheetProps, "bundle" | "frame">) {
  const { t } = useTranslation();
  const encounters = bundle.character!.encounters.filter(
    (person) => frame.facts?.[person.fact] === true,
  );
  return (
    <>
      {encounters.length ? (
        encounters.map((person) => <Encounter key={person.id} person={person} />)
      ) : (
        <p>{t("noEncounters")}</p>
      )}
    </>
  );
}

function CharacterDetails({
  bundle,
  frame,
  profile,
  game,
  notes,
  inventoryControls,
  tab,
  onDismiss,
}: Omit<SheetProps, "onClose" | "combat" | "attributeDetails"> & {
  profile: CharacterProfile;
  tab: Tab | null;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      {tab === "notes" && <ReaderNotesDialog port={notes} onDismiss={onDismiss} />}
      {tab && tab !== "notes" && (
        <ReaderModal
          className="character-detail-modal"
          title={t(tab)}
          onDismiss={onDismiss}
          closeLabel={t("close")}
        >
          {tab === "inventory" && (
            <InventoryContents
              bundle={bundle}
              frame={frame}
              game={game}
              inventoryControls={inventoryControls}
            />
          )}
          {tab === "encounters" && <KnownEncounters bundle={bundle} frame={frame} />}
          {tab === "abilities" && <CharacterAbilities bundle={bundle} profile={profile} />}
        </ReaderModal>
      )}
    </>
  );
}
