import { expect, it } from "vitest";
import { illustrationDefaults } from "../../contracts/illustration.ts";
import {
  addPicture,
  changePicture,
  duplicatePicture,
  patchPicture,
  picturesOf,
  removePicture,
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
    value: { ...scene.value, base: { role: "midground", x: 0, y: 0, scale: 1 }, layers: [] },
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
  });
});
