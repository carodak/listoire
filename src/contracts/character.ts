import { z } from "zod";

const AttributeSchema = z
  .object({
    initial: z.number().int().min(3).max(18),
    current: z.number().int().min(3).max(18),
    rolls: z.array(z.number().int().min(1).max(6)).length(3),
  })
  .strict()
  .refine((value) => value.initial === value.rolls.reduce((sum, roll) => sum + roll, 0));
export const CharacterSchema = z
  .object({
    health: z
      .object({ current: z.number().int().min(0), max: z.number().int().min(6) })
      .strict()
      .refine((value) => value.current <= value.max),
    attributes: z
      .object({ STR: AttributeSchema, DEX: AttributeSchema, WIL: AttributeSchema })
      .strict(),
    abilities: z
      .array(z.object({ id: z.string(), rank: z.number().int().min(1).max(4) }).strict())
      .min(1)
      .max(2),
  })
  .strict();
export type CharacterProfile = z.infer<typeof CharacterSchema>;
export const CharacterDefinitionSchema = z
  .object({
    portrait: z.string(),
    abilities: z
      .array(z.object({ id: z.string(), name: z.string(), description: z.string() }).strict())
      .min(1)
      .max(2),
    inventory: z
      .array(
        z
          .object({ id: z.string(), fact: z.string(), name: z.string(), description: z.string() })
          .strict(),
      )
      .max(20),
    encounters: z
      .array(
        z
          .object({ id: z.string(), fact: z.string(), name: z.string(), description: z.string() })
          .strict(),
      )
      .max(20),
  })
  .strict();
