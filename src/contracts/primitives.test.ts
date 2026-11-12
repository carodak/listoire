import { expect, it } from "vitest";
import { HexColorSchema } from "./primitives.ts";

it("accepts 3- and 6-digit hex colours only", () => {
  for (const color of ["#abc", "#AABBCC", "#0f0f0f"])
    expect(HexColorSchema.safeParse(color).success).toBe(true);
  // 4/5/7-digit values are not colours; 8-digit (#rrggbbaa) never matches the story palette.
  for (const color of ["#abcd", "#12345", "#1234567", "#12345678", "abc", "#ggg"])
    expect(HexColorSchema.safeParse(color).success).toBe(false);
});
