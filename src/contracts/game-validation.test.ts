import { describe, expect, it } from "vitest";
import { createCharacter } from "../features/character/create-character.ts";
import { GameDefinitionSchema, GameStateSchema } from "./game.ts";
import type { GameState } from "./game.ts";
import { FrameSchema } from "./story.ts";
import { validateGameState } from "./game-validation.ts";

/** A consistent state: an HP amulet is equipped, so max HP is 6 + 2. */
function world() {
  const character = createCharacter(["air", "insight"], () => 4);
  character.health = { current: 8, max: 8 };
  const definition = GameDefinitionSchema.parse({
    abilities: [
      { id: "air", attribute: "DEX", offensive: true, effect: "stun" },
      { id: "insight", attribute: "WIL" },
    ],
    items: [
      { id: "sword", name: "Sword", slot: "weapon" },
      { id: "amulet", name: "Amulet", slot: "accessory", bonus: { HP: 2 } },
    ],
    encounters: [{ id: "wolf", name: "Wolf", difficulty: "easy", profile: "balanced" }],
    actions: [
      { id: "fight", label: "Fight", kind: "combat", reference: "wolf" },
      { id: "look", label: "Look", kind: "stat-check", attribute: "WIL" },
      { id: "gift", label: "Take", kind: "give-item", reference: "sword" },
    ],
  });
  const game: GameState = GameStateSchema.parse({
    rng: 7,
    xp: 0,
    baseMaxHp: 6,
    inventory: ["amulet"],
    equipment: { accessory: "amulet" },
  });
  const frame = FrameSchema.parse({
    passageId: "start",
    segments: [{ id: "start.p1", text: "A wolf blocks the path." }],
    choices: [
      { id: "c-fight", text: "Fight", gameAction: "fight" },
      { id: "c-look", text: "Look", gameAction: "look" },
      { id: "c-gift", text: "Take", gameAction: "gift" },
    ],
  });
  return { character, definition, game, frame };
}
type World = ReturnType<typeof world>;
const validate = ({ game, character, definition, frame }: World, withFrame = true) =>
  validateGameState(game, character, definition, withFrame ? frame : undefined);

function inCombat(w: World) {
  w.game.combat = {
    encounterId: "wolf",
    choiceId: "c-fight",
    hp: 5,
    maxHp: 5,
    damage: 2,
    turn: 2,
    effects: [{ ability: "air", kind: "stun", turns: 1 }],
  };
}
function result(extra: Partial<NonNullable<GameState["lastResult"]>> = {}) {
  return { success: true, roll: 0, message: "Done", ...extra };
}

type Change = (w: World) => void;
type Rejection = [name: string, change: Change, message: string];
const set =
  (change: Partial<GameState>): Change =>
  (w) =>
    Object.assign(w.game, change);
const look = { choiceId: "c-look", actionId: "look", rolled: false };

const consistent: [string, Change][] = [
  ["equipment, inventory and HP that agree", () => {}],
  ["an active encounter tied to its story choice", inCombat],
  ["an unrolled pending check", set({ pendingCheck: look })],
  [
    "a rolled pending check with its dice",
    set({
      pendingCheck: { ...look, rolled: true },
      lastResult: result({ dice: [{ sides: 20, value: 4 }] }),
    }),
  ],
  [
    "a pending item event with its result",
    set({ pendingEvent: { choiceId: "c-gift" }, lastResult: result() }),
  ],
  [
    "a pending combat event once the outcome is known",
    set({ pendingEvent: { choiceId: "c-fight" }, lastResult: result({ outcome: "victory" }) }),
  ],
];
const inconsistent: Rejection[] = [
  [
    "a repeated character ability",
    (w) => void w.character.abilities.push({ id: "air", rank: 2 }),
    "Unknown or repeated character ability",
  ],
  [
    "an unknown character ability",
    (w) => void (w.character.abilities[0]!.id = "ghost"),
    "Unknown or repeated character ability",
  ],
  [
    "a repeated inventory item",
    set({ inventory: ["amulet", "amulet"] }),
    "Unknown or repeated inventory item",
  ],
  [
    "an unknown inventory item",
    set({ inventory: ["amulet", "ghost"] }),
    "Unknown or repeated inventory item",
  ],
  [
    "an equipped item that is not carried",
    set({ equipment: { accessory: "amulet", weapon: "sword" } }),
    "Invalid equipped item",
  ],
  [
    "an item equipped in the wrong slot",
    set({ inventory: ["amulet", "sword"], equipment: { weapon: "amulet" } }),
    "Invalid equipped item",
  ],
  [
    "max HP that ignores equipment bonuses",
    (w) => void (w.character.health = { current: 6, max: 6 }),
    "Character HP disagrees with equipment",
  ],
  [
    "an unknown ability in the last result",
    set({ lastResult: result({ abilityUsed: "ghost" }) }),
    "Unknown ability used in result",
  ],
];
const invalidCombat: Rejection[] = [
  [
    "an unknown encounter",
    (w) => void (w.game.combat!.encounterId = "bear"),
    "Invalid active encounter",
  ],
  [
    "opponent HP above its maximum",
    (w) => void (w.game.combat!.hp = 9),
    "Invalid active encounter",
  ],
  [
    "a defeated character still fighting",
    (w) => void (w.character.health.current = 0),
    "Invalid active encounter",
  ],
  [
    "an effect that the ability cannot cause",
    (w) => void (w.game.combat!.effects[0]!.kind = "charm"),
    "Invalid combat ability effect",
  ],
  ["a pending check during combat", set({ pendingCheck: look }), "Invalid pending check"],
];
const invalidChecks: [string, NonNullable<GameState["pendingCheck"]>, boolean][] = [
  ["an unknown action", { ...look, actionId: "ghost" }, true],
  ["an action that is not a check", { choiceId: "c-gift", actionId: "gift", rolled: false }, true],
  ["a choice that does not offer it", { ...look, choiceId: "c-fight" }, true],
  ["a roll without dice", { ...look, rolled: true }, true],
  ["no frame to resolve the choice", look, false],
];
const invalidEvents: [string, Change][] = [
  ["has no result yet", set({ pendingEvent: { choiceId: "c-gift" } })],
  ["points at a check", set({ pendingEvent: { choiceId: "c-look" }, lastResult: result() })],
  [
    "ends combat without an outcome",
    set({ pendingEvent: { choiceId: "c-fight" }, lastResult: result() }),
  ],
  [
    "points at an unknown choice",
    set({ pendingEvent: { choiceId: "c-missing" }, lastResult: result() }),
  ],
  [
    "overlaps a pending check",
    set({ pendingEvent: { choiceId: "c-gift" }, lastResult: result(), pendingCheck: look }),
  ],
];

describe("validateGameState accepts consistent states", () => {
  it.each(consistent)("%s", (_, change) => {
    const w = world();
    change(w);
    expect(() => validate(w)).not.toThrow();
  });

  it("skips the story-choice check for an encounter when no frame is given", () => {
    const w = world();
    inCombat(w);
    w.game.combat!.choiceId = "c-look";
    expect(() => validate(w, false)).not.toThrow();
    expect(() => validate(w)).toThrow("Encounter has no matching story choice");
  });
});

describe("validateGameState rejects inconsistent states", () => {
  it.each(inconsistent)("%s", (_, change, message) => {
    const w = world();
    change(w);
    expect(() => validate(w)).toThrow(message);
  });

  it.each(invalidCombat)("during combat: %s", (_, change, message) => {
    const w = world();
    inCombat(w);
    change(w);
    expect(() => validate(w)).toThrow(message);
  });
});

describe("validateGameState rejects broken pending checks and events", () => {
  it.each(invalidChecks)("pending check with %s", (_, pending, withFrame) => {
    const w = world();
    w.game.pendingCheck = pending;
    expect(() => validate(w, withFrame)).toThrow("Invalid pending check");
  });

  it("validates the saved origin of a pending check as its own state", () => {
    const w = world();
    const origin = structuredClone(w.character);
    origin.abilities[0]!.id = "ghost";
    w.game.pendingCheck = { ...look, origin: { character: origin, rng: 3, xp: 0, baseMaxHp: 6 } };
    expect(() => validate(w)).toThrow("Unknown or repeated character ability");
  });

  it.each(invalidEvents)("pending story event that %s", (_, change) => {
    const w = world();
    change(w);
    expect(() => validate(w)).toThrow("Invalid pending story event");
  });
});
