import { expect, it } from "vitest";
import { cropOutput, inkBounds } from "./smart-crop.ts";
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

it("keeps a whole picture, and limits a cropped one to 2048 px", () => {
  // A dark square on pale paper, 300 px from each edge of a 3000 px picture.
  const pixels = new Uint8ClampedArray(30 * 30 * 4).fill(255);
  for (let y = 3; y < 27; y++)
    for (let x = 3; x < 27; x++) {
      const at = (y * 30 + x) * 4;
      pixels[at] = pixels[at + 1] = pixels[at + 2] = 0;
    }
  expect(cropOutput(3000, 3000, inkBounds(pixels, 30, 30))).toMatchObject({
    width: 2048,
    height: 2048,
  });
  // The same picture with no paper around it is left as it is.
  const full = new Uint8ClampedArray(30 * 30 * 4)
    .fill(0)
    .map((_, index) => (index % 4 === 3 ? 255 : 0));
  expect(cropOutput(3000, 3000, inkBounds(full, 30, 30))).toBeNull();
});
