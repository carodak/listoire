import { useState } from "react";
import {
  GameItemSchema,
  EncounterSchema,
  GameDefinitionSchema,
  attributes,
} from "../../contracts/game.ts";
import type { GameDefinition } from "../../contracts/game.ts";
import { Field, SelectField } from "./Fields.tsx";
interface Props {
  game: GameDefinition;
  onChange: (game: GameDefinition) => void;
}

export function GameCatalog({ tab, game, onChange }: Props & { tab: string }) {
  const [selected, select] = useState(0);
  if (tab === "Rules") return <GameRules game={game} onChange={onChange} />;
  if (tab === "Abilities") return <AbilityList game={game} onChange={onChange} />;
  const encounter = tab === "Encounters",
    list = encounter ? game.encounters : game.items;

  return (
    <section>
      <button
        onClick={() => {
          select(list.length);
          onChange(addDefinition(game, encounter));
        }}
      >
        + {encounter ? "Encounter" : "Item"}
      </button>
      <label>
        {encounter ? "Encounter" : "Item"}
        <select value={selected} onChange={(event) => select(Number(event.target.value))}>
          {list.map((item, index) => (
            <option key={index} value={index}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {encounter ? (
        <EncounterFields game={game} selected={selected} onChange={onChange} />
      ) : (
        <ItemFields game={game} selected={selected} onChange={onChange} />
      )}
    </section>
  );
}
function GameRules({ game, onChange }: Props) {
  const update = (rules: Partial<GameDefinition["rules"]>) =>
    onChange({ ...game, rules: { ...game.rules, ...rules } });
  return (
    <fieldset>
      <legend>Combat rules · approved defaults</legend>
      <p>
        One weapon and one accessory. Gear is locked during encounters. Enemy HP and damage freeze
        at the start. Resolve defeat and boss recovery through authored story actions.
      </p>
      <SelectField
        label="Escape attribute"
        value={game.rules.fleeAttribute}
        options={attributes}
        onChange={(fleeAttribute) => update({ fleeAttribute })}
      />
      {(
        [
          "fleeFailureRetaliates",
          "effectsBeforeRetaliation",
          "stunCancelsRetaliation",
          "hpBonusHeals",
        ] as const
      ).map((key) => (
        <Field
          key={key}
          type="checkbox"
          label={
            {
              fleeFailureRetaliates: "Enemy retaliates after failed escape",
              effectsBeforeRetaliation: "Apply effects before retaliation",
              stunCancelsRetaliation: "Stun cancels retaliation",
              hpBonusHeals: "HP bonus also heals (default off)",
            }[key]
          }
          checked={game.rules[key]}
          onChange={(event) => update({ [key]: event.target.checked })}
        />
      ))}
      <Field
        label="Weaken damage reduction"
        type="number"
        min={1}
        max={10}
        value={game.rules.weakeningDamageReduction}
        onChange={(event) => update({ weakeningDamageReduction: Number(event.target.value) })}
      />
    </fieldset>
  );
}
interface AbilityFieldsProps {
  ability: GameDefinition["abilities"][number];
  onChange: (ability: GameDefinition["abilities"][number]) => void;
}

function AbilityFields({ ability, onChange }: AbilityFieldsProps) {
  const update = (patch: Partial<typeof ability>) => onChange({ ...ability, ...patch });
  return (
    <fieldset>
      <legend>{ability.id}</legend>
      <Field
        label="Ability ID"
        value={ability.id}
        onChange={(event) => update({ id: event.target.value })}
      />
      <Field
        label="Ability name"
        value={ability.name ?? ""}
        onChange={(event) => update({ name: event.target.value })}
      />
      <Field
        label="Ability description"
        value={ability.description ?? ""}
        onChange={(event) => update({ description: event.target.value })}
      />
      <SelectField
        label="Damage attribute"
        value={ability.attribute}
        options={attributes}
        onChange={(attribute) => update({ attribute })}
      />
      <Field
        label="Offensive ability"
        type="checkbox"
        checked={ability.offensive}
        onChange={(event) => update({ offensive: event.target.checked })}
      />
      {ability.offensive && (
        <SelectField
          label="Special effect"
          value={ability.effect}
          options={["none", "stun", "weaken", "charm"] as const}
          onChange={(effect) => update({ effect })}
        />
      )}
      <p>
        Ranks 1–4 succeed on 5+, 4+, 3+, 2+. Offensive abilities deal 7 plus the attribute bonus. A
        special effect has a separate 1-in-3 activation roll.
      </p>
    </fieldset>
  );
}
function EncounterFields({ game, selected, onChange }: Props & { selected: number }) {
  const item = game.encounters[selected];
  if (!item) return null;
  const update = (patch: Partial<typeof item>) =>
    onChange({
      ...game,
      encounters: game.encounters.map((item, index) =>
        index === selected ? { ...item, ...patch } : item,
      ),
    });
  return (
    <fieldset>
      <legend>Encounter</legend>
      <DefinitionIdentity item={item} onChange={update} />
      <SelectField
        label="Difficulty"
        value={item.difficulty}
        options={["easy", "normal", "hard", "boss"] as const}
        onChange={(difficulty) => update({ difficulty })}
      />
      <SelectField
        label="Profile"
        value={item.profile}
        options={["resilient", "balanced", "offensive"] as const}
        onChange={(profile) => update({ profile })}
      />
      <p>
        Calibration excludes gear and abilities. Normal/balanced targets a 75% chance with ordinary
        attacks.
      </p>
    </fieldset>
  );
}
function ItemFields({ game, selected, onChange }: Props & { selected: number }) {
  const item = game.items[selected];
  if (!item) return null;
  const update = (patch: Partial<typeof item>) =>
    onChange({
      ...game,
      items: game.items.map((item, index) => (index === selected ? { ...item, ...patch } : item)),
    });
  return (
    <fieldset>
      <legend>Item</legend>
      <DefinitionIdentity item={item} onChange={update} />
      <SelectField
        label="Equipment slot"
        value={item.slot}
        options={["none", "weapon", "accessory"] as const}
        onChange={(slot) => update({ slot })}
      />
      <SelectField
        label="Weapon attribute"
        value={item.attribute}
        options={attributes}
        onChange={(attribute) => update({ attribute })}
      />
      <ItemBonuses
        item={item}
        onChange={update}
        abilities={game.abilities.map((ability) => ability.id)}
      />
      <p>
        Items remain until a Remove Item action. A consumable is used through its authored narrative
        choice.
      </p>
    </fieldset>
  );
}
interface ItemBonusesProps {
  item: GameDefinition["items"][number];
  onChange: (patch: Partial<GameDefinition["items"][number]>) => void;
  abilities: string[];
}

function ItemBonuses({ item, onChange, abilities }: ItemBonusesProps) {
  return (
    <fieldset>
      <legend>Equipment bonuses</legend>
      {([...attributes, "damage", "HP"] as const).map((key) => (
        <Field
          key={key}
          label={`${key} bonus`}
          type="number"
          min={0}
          max={10}
          value={item.bonus[key]}
          onChange={(event) =>
            onChange({ bonus: { ...item.bonus, [key]: Number(event.target.value) } })
          }
        />
      ))}
      <SelectField
        label="Ability rank bonus (blank = none)"
        value={item.ability ?? ""}
        options={["", ...abilities]}
        onChange={(ability) => onChange({ ability: ability || undefined })}
      />
    </fieldset>
  );
}

function AbilityList({ game, onChange }: Props) {
  return (
    <fieldset>
      <legend>Character abilities</legend>
      <button
        disabled={game.abilities.length >= 32}
        onClick={() =>
          onChange(
            GameDefinitionSchema.parse({
              ...game,
              abilities: [
                ...game.abilities,
                { id: `spell-${crypto.randomUUID()}`, name: "New ability", attribute: "WIL" },
              ],
            }),
          )
        }
      >
        + Ability / spell
      </button>
      <p>
        Start with up to two abilities. Add Learn actions to unlock other spells during the story.
      </p>
      {game.abilities.map((ability, index) => (
        <AbilityFields
          key={index}
          ability={ability}
          onChange={(ability) =>
            onChange({
              ...game,
              abilities: game.abilities.map((item, at) => (at === index ? ability : item)),
            })
          }
        />
      ))}
    </fieldset>
  );
}

function addDefinition(game: GameDefinition, encounter: boolean) {
  return encounter
    ? {
        ...game,
        encounters: [
          ...game.encounters,
          EncounterSchema.parse({
            id: `enemy-${crypto.randomUUID()}`,
            name: "New encounter",
            difficulty: "normal",
            profile: "balanced",
          }),
        ],
      }
    : {
        ...game,
        items: [
          ...game.items,
          GameItemSchema.parse({
            id: `item-${crypto.randomUUID()}`,
            name: "New item",
            slot: "none",
          }),
        ],
      };
}

function DefinitionIdentity({
  item,
  onChange: update,
}: {
  item: { id: string; name: string };
  onChange: (patch: Partial<{ id: string; name: string }>) => void;
}) {
  return (
    <>
      <Field
        label="Stable ID"
        value={item.id}
        onChange={(event) => update({ id: event.target.value })}
      />
      <Field
        label="Name"
        value={item.name}
        onChange={(event) => update({ name: event.target.value })}
      />
    </>
  );
}
