import { expect, it } from "vitest";
import { boundedCameraOffset, cameraTransform, imagePoint } from "./camera.ts";
it("samples the exact image area independently of surrounding letterbox space", () => {
  const image = { left: 100, top: 50, width: 200, height: 300 };
  expect(imagePoint(150, 200, image)).toEqual({ x: 0.25, y: 0.5 });
  expect(imagePoint(0, 999, image)).toEqual({ x: 0, y: 1 });
  expect(cameraTransform(2, 80 - 0.25 * 200 * 2, 80 - 0.5 * 300 * 2)).toBe(
    "translate(-20px, -220px) scale(2)",
  );
});
it("keeps a zoomed camera inside its image margins and centers an unzoomed camera", () => {
  expect(boundedCameraOffset({ x: 999, y: -999 }, { width: 200, height: 300 }, 1.5)).toEqual({
    x: 50,
    y: -75,
  });
  expect(boundedCameraOffset({ x: 20, y: 30 }, { width: 200, height: 300 }, 1)).toEqual({
    x: 0,
    y: 0,
  });
});
