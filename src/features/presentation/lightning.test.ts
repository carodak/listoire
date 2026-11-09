import { expect, it } from "vitest";
import { boltPaths } from "./lightning.ts";

const points = (d: string) =>
  [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((match) => [
    Number(match[1]),
    Number(match[2]),
  ]);

it("draws a jagged main channel with forks, the same for the same seed", () => {
  const bolt = boltPaths(42);
  expect(boltPaths(42)).toEqual(bolt);
  expect(boltPaths(43).main).not.toBe(bolt.main);
  expect(points(bolt.main)).toHaveLength(65); // 6 subdivision passes
  expect(bolt.forks.length).toBeGreaterThanOrEqual(2);
  expect(bolt.forks.length).toBeLessThanOrEqual(3);
  // Forks start on the main channel.
  const main = points(bolt.main).map(([x, y]) => `${x} ${y}`);
  for (const fork of bolt.forks) expect(main).toContain(points(fork)[0]!.join(" "));
});

it("stays roughly inside the viewport for any seed", () => {
  for (let seed = 1; seed < 200; seed++)
    for (const d of [boltPaths(seed).main, ...boltPaths(seed).forks])
      for (const [x, y] of points(d)) {
        expect(x).toBeGreaterThan(-25);
        expect(x).toBeLessThan(125);
        expect(y).toBeGreaterThan(-25);
        expect(y).toBeLessThan(125);
      }
});
