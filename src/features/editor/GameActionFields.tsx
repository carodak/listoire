import { attributes, GameActionSchema } from "../../contracts/game.ts";
import type { GameAction, GameDefinition } from "../../contracts/game.ts";
import { Field, SelectField } from "./Fields.tsx";
interface Props {
  action: GameAction;
  game: GameDefinition;
  onChange: (patch: Partial<GameAction>) => void;
}
export function GameActionFields({ action, game, onChange }: Props) {
  return (
    <fieldset>
      <legend>Action properties</legend>
      <Field
        label="Stable action ID"
        value={action.id}
        onChange={(event) => onChange({ id: event.target.value })}
      />
      <Field
        label="Choice label"
        value={action.label}
        onChange={(event) => onChange({ label: event.target.value })}
      />
      <SelectField
        label="Action type"
        value={action.kind}
        options={GameActionSchema.shape.kind.options}
        onChange={(kind) => onChange({ kind })}
      />
      {action.kind === "stat-check" && (
        <SelectField
          label="Attribute"
          value={action.attribute}
          options={attributes}
          onChange={(attribute) => onChange({ attribute })}
        />
      )}
      <ActionReference action={action} game={game} onChange={onChange} />
      {["heal", "xp", "train"].includes(action.kind) && (
        <Field
          label="Amount"
          type="number"
          min={action.kind === "heal" ? -100 : 1}
          max={100}
          value={action.amount}
          onChange={(event) => onChange({ amount: Number(event.target.value) })}
        />
      )}
    </fieldset>
  );
}
function ActionReference({ action, game, onChange }: Props) {
  const lists: Partial<Record<GameAction["kind"], { id: string }[]>> = {
    combat: game.encounters,
    "give-item": game.items,
    "remove-item": game.items,
    "ability-check": game.abilities,
    train: game.abilities,
    learn: game.abilities,
  };
  const list = lists[action.kind];
  return (
    list && (
      <SelectField
        label="Use definition"
        value={action.reference}
        options={["", ...list.map((item) => item.id)]}
        labels={{ "": "Choose…" }}
        onChange={(reference) => onChange({ reference })}
      />
    )
  );
}
