import { expect, it } from "vitest";
import { inkBounds } from "./smart-crop.ts";
it("finds padded transparent and pale-paper content while preserving empty images", () => {
  const pixels = new Uint8ClampedArray(40 * 40 * 4).fill(255);
  for (let y = 10; y < 30; y++)
    for (let x = 15; x < 25; x++) {
      const at = (y * 40 + x) * 4;
      pixels[at] = pixels[at + 1] = pixels[at + 2] = 40;
    }
  expect(inkBounds(pixels, 40, 40)).toEqual({ x: 0.325, y: 0.2, width: 0.35, height: 0.6 });
  expect(inkBounds(new Uint8ClampedArray(40 * 40 * 4), 40, 40)).toBeNull();
});
