import { useState } from "react";
import type { StoryProject } from "../../contracts/editor-project.ts";
import { GameActionSchema } from "../../contracts/game.ts";
import type { GameDefinition, GameAction } from "../../contracts/game.ts";
import { EditorDialog } from "./EditorDialog.tsx";
import { initialGame, applyGameConfiguration } from "./game-authoring.ts";
import { GameActionFields } from "./GameActionFields.tsx";
import { GameCatalog } from "./GameCatalog.tsx";

const actionKinds: Record<string, GameAction["kind"]> = {
  "Stat Check": "stat-check",
  "Ability Check": "ability-check",
  HP: "heal",
  XP: "xp",
  Combat: "combat",
};
interface GameEditorProps {
  project: StoryProject;
  locale: string;
  command: string;
  onApply: (project: StoryProject, script?: string) => void;
  onClose: () => void;
}

export function GameEditor({ project, locale, command, onApply, onClose }: GameEditorProps) {
  const [game, setGame] = useState(() => initialGame(project, locale));
  const [tab, setTab] = useState(
    actionKinds[command] || command === "Game Condition"
      ? "Actions"
      : command === "Ability"
        ? "Abilities"
        : "Items",
  );
  const [error, setError] = useState("");
  function apply(script?: string) {
    try {
      const id = script?.match(/game:([a-z][a-z0-9.-]*)/)?.[1];
      const next = applyGameConfiguration(project, locale, game, id);
      onApply(next, script);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }
  return (
    <EditorDialog title="Game · rules and actions" onClose={onClose}>
      <p>
        Checks use one visible roll. A resolved check or encounter earns 1 XP. Every 5 XP improves
        the hero. Encounters use the approved enemy formula.
      </p>
      <nav aria-label="Game configuration">
        {["Items", "Abilities", "Encounters", "Actions", "Rules"].map((name) => (
          <button type="button" key={name} aria-pressed={tab === name} onClick={() => setTab(name)}>
            {name}
          </button>
        ))}
      </nav>
      {tab === "Actions" ? (
        <GameActions
          game={game}
          onChange={setGame}
          initialKind={actionKinds[command]}
          onInsert={apply}
        />
      ) : (
        <GameCatalog key={tab} tab={tab} game={game} onChange={setGame} />
      )}
      {error && <pre role="alert">{error}</pre>}
      <footer>
        <button onClick={onClose}>Cancel</button>
        <button className="primary" onClick={() => apply()}>
          Apply game configuration
        </button>
      </footer>
    </EditorDialog>
  );
}
const GAME_CONDITION = "\n{game_success:\n    Success.\n- else:\n    Failure.\n}\n";
const newAction = (kind: GameAction["kind"]) =>
  GameActionSchema.parse({ id: `action-${crypto.randomUUID()}`, label: "New action", kind });
const actionChoiceScript = (action: GameAction) =>
  `\n+ [${action.label.replace(/[[\]#\n\r]/g, " ")} # game:${action.id}]\n    {game_success:\n        Success.\n    - else:\n        Failure or escape.\n    }\n    -> END\n`;

interface GameActionsProps {
  game: GameDefinition;
  onChange: (game: GameDefinition) => void;
  initialKind?: GameAction["kind"];
  onInsert: (script: string) => void;
}

function GameActions({ game, onChange, initialKind = "stat-check", onInsert }: GameActionsProps) {
  const [selected, select] = useState(0);
  const actions = game.actions;
  const action = actions[selected];
  const update = (patch: Partial<GameAction>) =>
    onChange({
      ...game,
      actions: actions.map((item, index) => (index === selected ? { ...item, ...patch } : item)),
    });
  return (
    <section>
      <p>
        Create an action, then insert its choice into the script. Branch with{" "}
        <code>game_success</code>; <code>game_roll</code>, <code>game_hp</code> and{" "}
        <code>game_xp</code> are available in Ink.
      </p>
      <button onClick={() => onInsert(GAME_CONDITION)}>Insert game condition</button>
      <button
        onClick={() => {
          onChange({ ...game, actions: [...actions, newAction(initialKind)] });
          select(actions.length);
        }}
      >
        + Action
      </button>
      <label>
        Action
        <select value={selected} onChange={(event) => select(Number(event.target.value))}>
          {actions.map((item, index) => (
            <option key={index} value={index}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      {action && (
        <>
          <GameActionFields action={action} game={game} onChange={update} />
          <button onClick={() => onInsert(actionChoiceScript(action))}>
            Apply and insert action choice
          </button>
          <button
            onClick={() => {
              onChange({ ...game, actions: actions.filter((_, index) => index !== selected) });
              select(0);
            }}
          >
            Remove action definition
          </button>
        </>
      )}
    </section>
  );
}
