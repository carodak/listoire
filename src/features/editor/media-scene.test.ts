import { expect, it } from "vitest";
import { CinematicSchema } from "../../contracts/cinematic.ts";
import { illustrationDefaults } from "../../contracts/illustration.ts";
import { imageScene } from "./media-scene.ts";
import { mediaDefaults } from "./media-form.ts";

it("saves a single image without cinematic camera motion and allows a fade-in", () => {
  const input = mediaDefaults("Image", "room", "sketch");
  input.asset = "sketch.room";
  input.effect = "fade-in";
  input.illustration = illustrationDefaults();
  input.motion = CinematicSchema.parse({ preset: "parallax" });
  const scene = imageScene({ title: "Room", progress: 0 }, input, []);
  expect(scene.blocks?.find((block) => block.kind === "media")).toMatchObject({
    motion: { preset: "none" },
  });
  expect(
    scene.events?.map((event) => event.action.kind === "effect" && event.action.effect.id),
  ).toContain("fade-in");
  expect(
    scene.events?.some(
      (event) => event.action.kind === "effect" && event.action.effect.id === "cinematic-camera",
    ),
  ).toBe(false);
});

it("keeps the cinematic camera when a separate image layer supplies real depth", () => {
  const input = mediaDefaults("Image", "room", "sketch");
  input.asset = "sketch.room";
  input.illustration = {
    ...illustrationDefaults(),
    layers: [{ image: "sketch.tree", role: "foreground", x: 0, y: 0, scale: 1 }],
  };
  input.motion = CinematicSchema.parse({ preset: "parallax" });
  const scene = imageScene({ title: "Room", progress: 0 }, input, []);
  expect(
    scene.events?.some(
      (event) => event.action.kind === "effect" && event.action.effect.id === "cinematic-camera",
    ),
  ).toBe(true);
});
