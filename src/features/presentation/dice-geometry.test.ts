import { expect, it } from "vitest";
import six from "./dice-assets/d6.json";
import twenty from "./dice-assets/d20.json";

it.each([
  { sides: 6, model: six },
  { sides: 20, model: twenty },
])("keeps every d$sides face and a valid landing orientation", ({ sides, model }) => {
  expect(model.poses.map((pose) => pose.value).sort((a, b) => a - b)).toEqual(
    Array.from({ length: sides }, (_, i) => i + 1),
  );
  expect(model.position.length % 9).toBe(0);
  expect(model.normal.length).toBe(model.position.length);
  expect(model.uv.length).toBe((model.position.length / 3) * 2);
  for (const { matrix } of model.poses) {
    const rows = [0, 1, 2].map((row) => [matrix[row]!, matrix[row + 4]!, matrix[row + 8]!]);
    for (const [i, row] of rows.entries())
      for (const [j, other] of rows.entries()) {
        expect(row.reduce((sum, value, axis) => sum + value * other[axis]!, 0)).toBeCloseTo(
          i === j ? 1 : 0,
          5,
        );
      }
    const normal = rows[2]!;
    const distances = Array.from({ length: model.position.length / 3 }, (_, i) =>
      normal.reduce((sum, value, axis) => sum + value * model.position[i * 3 + axis]!, 0),
    );
    const front = Math.max(...distances);
    expect(
      distances.filter((distance) => Math.abs(front - distance) < 0.0001).length,
    ).toBeGreaterThanOrEqual(3);
  }
});
