import { expect, it } from "vitest";
import { illustrationDefaults } from "../../contracts/illustration.ts";
import {
  addPicture,
  changePicture,
  duplicatePicture,
  movePicture,
  patchPicture,
  picturesOf,
  removePicture,
  shapeOf,
} from "./image-pictures.ts";

const empty = { image: "", value: illustrationDefaults() };

it("the first picture becomes the main one at its depth; the next ones are layers", () => {
  const first = addPicture(empty, "tree", "midground");
  expect(first).toMatchObject({ image: "tree", index: -1, value: { base: { role: "midground" } } });
  const second = addPicture(first, "fern", "foreground");
  expect(second.index).toBe(0);
  expect(picturesOf(second).map((picture) => [picture.image, picture.role, picture.index])).toEqual(
    [
      ["tree", "midground", -1],
      ["fern", "foreground", 0],
    ],
  );
});

it("changes, moves and removes a picture; removing the main one promotes the next", () => {
  const scene = addPicture(addPicture(empty, "field", "background"), "girl", "midground");
  expect(changePicture(scene, 0, "boy").value.layers[0]!.image).toBe("boy");
  expect(changePicture(scene, -1, "sky").image).toBe("sky");
  expect(patchPicture(scene.value, 0, { role: "foreground" }).layers[0]!.role).toBe("foreground");
  expect(patchPicture(scene.value, -1, { x: 5 }).base.x).toBe(5);
  const promoted = removePicture(scene, -1);
  expect(promoted).toEqual({
    image: "girl",
    value: {
      ...scene.value,
      base: { role: "midground", x: 0, y: 0, scale: 1, fit: "contain" },
      layers: [],
    },
  });
  expect(removePicture(promoted, -1).image).toBe("");
  expect(removePicture(scene, 0).value.layers).toEqual([]);
});

it("duplicates a picture at its depth, shifted a little and kept inside the frame", () => {
  const scene = addPicture(empty, "tree", "background");
  const moved = { ...scene, value: patchPicture(scene.value, -1, { x: 72, y: -10, scale: 0.8 }) };
  const copy = duplicatePicture(moved, -1);
  expect(copy.index).toBe(0);
  expect(copy.value.layers[0]).toEqual({
    image: "tree",
    role: "background",
    x: 75,
    y: -4,
    scale: 0.8,
    fit: "contain",
  });
});

it("a new or changed image is shown whole; the frame can follow its shape", () => {
  // Pass 10: every image the dialog adds or changes carries fit "contain".
  const scene = addPicture(addPicture(empty, "field", "background"), "girl", "midground");
  expect(scene.value.base.fit).toBe("contain");
  expect(scene.value.layers[0]!.fit).toBe("contain");
  const old = {
    image: "field",
    value: {
      ...illustrationDefaults(),
      base: { role: "background" as const, x: 0, y: 0, scale: 1 },
    },
  };
  expect(changePicture(old, -1, "sky").value.base.fit).toBe("contain");
  const asset = (width: number, height: number) =>
    ({ id: "a", path: "a.webp", type: "image", alt: "", dimensions: { width, height } }) as const;
  expect(shapeOf(asset(3000, 2000))).toBe("landscape");
  expect(shapeOf(asset(1200, 2000))).toBe("portrait");
  expect(shapeOf(asset(2048, 2022))).toBe("square");
  expect(shapeOf(undefined)).toBeUndefined();
});

it("moves a layer in front of or behind another, or to the front of a depth", () => {
  let scene = addPicture(empty, "field", "background");
  for (const [image, role] of [
    ["girl", "midground"],
    ["boy", "midground"],
    ["fern", "foreground"],
  ] as const)
    scene = addPicture(scene, image, role);
  const names = (value: typeof scene.value) => value.layers.map((layer) => layer.image);
  // The girl in front of the boy (both middle): after him in drawing order.
  const front = movePicture(scene.value, 0, "midground", { index: 1, behind: false });
  expect(names(front.value)).toEqual(["boy", "girl", "fern"]);
  expect(front).toMatchObject({ index: 1, order: [1, 0, 2] });
  // The fern behind the girl, into the middle depth.
  const behind = movePicture(scene.value, 2, "midground", { index: 0, behind: true });
  expect(names(behind.value)).toEqual(["fern", "girl", "boy"]);
  expect(behind.value.layers[0]!.role).toBe("midground");
  // No target: the front of that depth; nothing goes behind the main picture.
  expect(names(movePicture(scene.value, 0, "foreground").value)).toEqual(["boy", "fern", "girl"]);
  const main = movePicture(scene.value, 1, "background", { index: -1, behind: true });
  expect(names(main.value)).toEqual(["boy", "girl", "fern"]);
  expect(main.value.layers[0]!.role).toBe("background");
  // The main picture only changes depth.
  const base = movePicture(scene.value, -1, "foreground", { index: 2, behind: false });
  expect(base.value.base.role).toBe("foreground");
  expect(names(base.value)).toEqual(["girl", "boy", "fern"]);
});
