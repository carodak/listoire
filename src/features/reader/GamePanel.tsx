import type { StoryBundle } from "../../contracts/story.ts";
import type { StoryDirector } from "../story-runtime/director.ts";

interface GamePanelProps {
  bundle: StoryBundle;
  director: StoryDirector;
  state: ReturnType<StoryDirector["getSnapshot"]>;
}

export function GamePanel({ bundle, director, state }: GamePanelProps) {
  const { game, character, occurrenceId } = state;
  if (!game || !character || !occurrenceId) return null;
  const combat = game.combat;
  const french = bundle.locale.startsWith("fr");
  return (
    <section className="game-panel" aria-label={french ? "Partie" : "Game"}>
      {game.lastResult && <p role="status">{game.lastResult.message}</p>}
      {combat && <CombatControls bundle={bundle} director={director} state={state} />}
    </section>
  );
}

function CombatControls({ bundle, director, state }: GamePanelProps) {
  const { game, character, occurrenceId } = state;
  if (!game?.combat || !character || !occurrenceId) return null;
  const combat = game.combat,
    french = bundle.locale.startsWith("fr");
  return (
    <fieldset disabled={state.busy || Boolean(state.failure)}>
      <legend>
        {bundle.game?.encounters.find((item) => item.id === combat.encounterId)?.name} · HP{" "}
        {combat.hp} / {combat.maxHp} · {french ? "Tour" : "Turn"} {combat.turn}
      </legend>
      <p>
        {french ? "Riposte" : "Retaliation"}: {combat.damage} ·{" "}
        {combat.effects.map((effect) => `${effect.kind} (${effect.turns})`).join(", ")}
      </p>
      <button onClick={() => void director.gameTurn({ kind: "attack" }, occurrenceId)}>
        {french ? "Attaquer" : "Attack"}
      </button>
      {bundle.game?.abilities
        .filter(
          (ability) =>
            ability.offensive && character.abilities.some((item) => item.id === ability.id),
        )
        .map((ability) => (
          <button
            key={ability.id}
            onClick={() =>
              void director.gameTurn({ kind: "ability", id: ability.id }, occurrenceId)
            }
          >
            {bundle.character?.abilities.find((item) => item.id === ability.id)?.name ??
              ability.name ??
              ability.id}
          </button>
        ))}
      <button onClick={() => void director.gameTurn({ kind: "flee" }, occurrenceId)}>
        {french ? "Fuir" : "Flee"}
      </button>
    </fieldset>
  );
}
export function GameInventory({ bundle, director, state }: GamePanelProps) {
  const { game, occurrenceId } = state;
  if (!game || !occurrenceId || !game.inventory.length) return null;
  const combat = game.combat,
    french = bundle.locale.startsWith("fr");
  return (
    <div className="game-inventory">
      {game.inventory.map((id) => {
        const item = bundle.game?.items.find((item) => item.id === id);
        if (!item) return null;
        const selected = Object.values(game.equipment).includes(id);
        return (
          <p key={id}>
            {item.name}{" "}
            {item.slot !== "none" && (
              <button
                disabled={state.busy || Boolean(combat)}
                title={
                  french
                    ? "Équipement verrouillé pendant le combat"
                    : "Equipment is locked during combat"
                }
                onClick={() =>
                  void director.gameTurn({ kind: selected ? "unequip" : "equip", id }, occurrenceId)
                }
              >
                {selected ? (french ? "Retirer" : "Unequip") : french ? "Équiper" : "Equip"}
              </button>
            )}
          </p>
        );
      })}
    </div>
  );
}
