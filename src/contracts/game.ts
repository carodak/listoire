import { z } from "zod";
import { CharacterSchema } from "./character.ts";
const id = z.string().regex(/^[a-z][a-z0-9.-]*$/);
export const attributes = ["STR", "DEX", "WIL"] as const;
const attribute = z.enum(attributes);
const bonus = z.number().int().min(0).max(10);
export const GameItemSchema = z
  .object({
    id,
    name: z.string().min(1).max(100),
    slot: z.enum(["weapon", "accessory", "none"]),
    attribute: attribute.default("STR"),
    bonus: z
      .object({
        STR: bonus.default(0),
        DEX: bonus.default(0),
        WIL: bonus.default(0),
        damage: bonus.default(0),
        HP: bonus.default(0),
      })
      .strict()
      .default({ STR: 0, DEX: 0, WIL: 0, damage: 0, HP: 0 }),
    ability: id.optional(),
    consumable: z.boolean().default(false),
    healing: z.number().int().min(0).max(100).default(0),
  })
  .strict();
const ability = z
  .object({
    id,
    name: z.string().max(100).optional(),
    description: z.string().max(1000).optional(),
    attribute: attribute,
    offensive: z.boolean().default(false),
    effect: z.enum(["none", "stun", "weaken", "charm"]).default("none"),
  })
  .strict();
export const EncounterSchema = z
  .object({
    id,
    name: z.string().min(1).max(100),
    difficulty: z.enum(["easy", "normal", "hard", "boss"]),
    profile: z.enum(["resilient", "balanced", "offensive"]),
    portrait: z.string().optional(),
  })
  .strict();
export const GameActionSchema = z
  .object({
    id,
    label: z.string().min(1).max(100),
    kind: z.enum([
      "stat-check",
      "ability-check",
      "combat",
      "give-item",
      "remove-item",
      "heal",
      "xp",
      "train",
      "learn",
    ]),
    attribute: attribute.default("DEX"),
    reference: z.string().default(""),
    amount: z.number().int().min(-100).max(100).default(1),
  })
  .strict();
const GameRulesSchema = z
  .object({
    fleeAttribute: attribute.default("DEX"),
    fleeFailureRetaliates: z.boolean().default(true),
    effectsBeforeRetaliation: z.boolean().default(true),
    stunCancelsRetaliation: z.boolean().default(true),
    weakeningDamageReduction: z.number().int().min(1).max(10).default(1),
    hpBonusHeals: z.boolean().default(false),
  })
  .strict();
export const GameDefinitionSchema = z
  .object({
    items: z.array(GameItemSchema).max(100).default([]),
    abilities: z.array(ability).max(32).default([]),
    encounters: z.array(EncounterSchema).max(50).default([]),
    actions: z.array(GameActionSchema).max(100).default([]),
    rules: GameRulesSchema.default({
      fleeAttribute: "DEX",
      fleeFailureRetaliates: true,
      effectsBeforeRetaliation: true,
      stunCancelsRetaliation: true,
      weakeningDamageReduction: 1,
      hpBonusHeals: false,
    }),
  })
  .strict()
  .superRefine((game, context) => {
    for (const list of [game.items, game.abilities, game.encounters, game.actions])
      if (new Set(list.map((item) => item.id)).size !== list.length)
        context.addIssue({ code: "custom", message: "Duplicate game definition ID" });
    for (const action of game.actions) {
      const targets: Partial<Record<typeof action.kind, { id: string }[]>> = {
        combat: game.encounters,
        "give-item": game.items,
        "remove-item": game.items,
        "ability-check": game.abilities,
        train: game.abilities,
        learn: game.abilities,
      };
      const list = targets[action.kind];
      if (list && !list.some((item) => item.id === action.reference))
        context.addIssue({
          code: "custom",
          message: `Unknown ${action.kind} reference: ${action.reference}`,
        });
    }
  });
const result = z
  .object({
    success: z.boolean(),
    roll: z.number().int(),
    dice: z
      .array(
        z
          .object({
            sides: z.union([z.literal(3), z.literal(4), z.literal(6), z.literal(20)]),
            value: z.number().int().min(1),
          })
          .strict()
          .refine((die) => die.value <= die.sides, "Roll exceeds die size"),
      )
      .max(4)
      .optional(),
    outcome: z.enum(["victory", "escaped", "defeat", "charmed"]).optional(),
    /** Combat damage this turn, for a localized log; older saves only have `message`. */
    dealt: z.number().int().nonnegative().optional(),
    received: z.number().int().nonnegative().optional(),
    usedItem: id.optional(),
    healed: z.number().int().nonnegative().optional(),
    fled: z.boolean().optional(),
    itemId: id.optional(),
    abilityId: id.optional(),
    abilityUsed: id.optional(),
    message: z.string().max(500),
  })
  .strict();
export const GameStateSchema = z
  .object({
    rng: z.number().int().min(1).max(4294967295),
    xp: z.number().int().min(0).max(4),
    baseMaxHp: z.number().int().min(6),
    inventory: z.array(id).max(100),
    equipment: z.object({ weapon: id.optional(), accessory: id.optional() }).strict(),
    pendingEvent: z.object({ choiceId: id }).strict().optional(),
    pendingCheck: z
      .object({
        choiceId: id,
        actionId: id,
        rolled: z.boolean(),
        origin: z
          .object({
            character: CharacterSchema,
            rng: z.number().int().min(1).max(4294967295),
            xp: z.number().int().min(0).max(4),
            baseMaxHp: z.number().int().min(6),
            lastResult: result.optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
    combat: z
      .object({
        encounterId: id,
        choiceId: z.string(),
        hp: z.number().int().nonnegative(),
        maxHp: z.number().int().positive(),
        damage: z.number().int().positive(),
        turn: z.number().int().positive(),
        effects: z
          .array(
            z
              .object({
                ability: id,
                kind: z.enum(["stun", "weaken", "charm"]),
                turns: z.number().int().min(1).max(3),
              })
              .strict(),
          )
          .max(2),
      })
      .strict()
      .optional(),
    lastResult: result.optional(),
  })
  .strict();
export type GameDefinition = z.infer<typeof GameDefinitionSchema>;
export type GameState = z.infer<typeof GameStateSchema>;
export type GameAction = z.infer<typeof GameActionSchema>;
export type GameMove =
  | { kind: "attack" }
  | { kind: "flee" }
  | { kind: "ability"; id: string }
  | { kind: "item"; id: string };
export type PlayerMove = GameMove | { kind: "equip"; id: string } | { kind: "unequip"; id: string };
export interface CheckOption {
  attribute: (typeof attributes)[number];
  sides: 6 | 20;
  threshold: number;
  comparison: "≤" | "≥";
}
export interface CombatOption {
  move: GameMove;
  probability: number;
  check?: CheckOption;
  damage?: {
    base: number;
    bonus: number;
    equipment: number;
    attribute: (typeof attributes)[number];
    score: number;
  };
  attackTable?: { die: number; damage: number }[];
  ranks?: { rank: number; threshold: number; damage: number; probability: number }[];
  rank?: number;
  healing?: number;
}
