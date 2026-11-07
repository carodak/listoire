import { expect, it } from "vitest";
import { inspectGlb, Scene3DSchema, validateSceneModels } from "./scene3d.ts";
import { RuntimeAssetSchema } from "./presentation.ts";
import { CinematicSchema } from "./cinematic.ts";

function glb(change: Record<string, unknown> = {}) {
  const json = JSON.stringify({
    asset: { version: "2.0" },
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [{ count: 3 }],
    nodes: [{}],
    ...change,
  });
  const encoded = new TextEncoder().encode(json.padEnd(Math.ceil(json.length / 4) * 4));
  const bytes = new Uint8Array(20 + encoded.length),
    view = new DataView(bytes.buffer);
  [0x46546c67, 2, bytes.length, encoded.length, 0x4e4f534a].forEach((value, index) =>
    view.setUint32(index * 4, value, true),
  );
  bytes.set(encoded, 20);
  return bytes;
}
const scene = Scene3DSchema.parse({
  version: 1,
  title: "Knight",
  elements: [{ assetId: "knight", layer: "main" }],
  style: "toon",
  position: "center",
  shot: "medium",
  ambience: "mist",
  particles: "none",
  blend: true,
  cinematic: { preset: "none" },
});

it("accepts GLB 2.0 and rejects external resources, compression, excessive geometry and cycles", () => {
  expect(inspectGlb(glb())).toHaveProperty("asset.version", "2.0");
  expect(() => inspectGlb(glb({ images: [{ uri: "https://example.org/track.png" }] }))).toThrow(
    /embedded/,
  );
  expect(() => inspectGlb(glb({ extensionsRequired: ["KHR_draco_mesh_compression"] }))).toThrow(
    /uncompressed/,
  );
  expect(() => inspectGlb(glb({ accessors: [{ count: 250001 }] }))).toThrow(/250,000/);
  expect(() => inspectGlb(glb({ nodes: [{ children: [0] }] }))).toThrow(/hierarchy/);
  expect(() => inspectGlb(new Uint8Array(30))).toThrow(/Invalid/);
});
it("allows scenery without a subject and limits crowding even in imported project data", () => {
  expect(Scene3DSchema.safeParse({ ...scene, elements: [] }).success).toBe(false);
  expect(
    Scene3DSchema.safeParse({ ...scene, elements: [{ assetId: "castle", layer: "background" }] })
      .success,
  ).toBe(true);
  expect(
    Scene3DSchema.safeParse({ ...scene, elements: Array(3).fill(scene.elements[0]) }).success,
  ).toBe(false);
});
it("only accepts the model's supported roles and actual animation clips", () => {
  const models = new Map([
    [
      "knight",
      {
        model3d: {
          category: "character" as const,
          roles: ["main" as const],
          dimensions: { x: 1, y: 2, z: 1 },
          animations: ["Idle"],
        },
      },
    ],
  ]);
  expect(() => validateSceneModels(scene, models)).not.toThrow();
  expect(() =>
    validateSceneModels(
      { ...scene, elements: [{ assetId: "knight", layer: "background" }] },
      models,
    ),
  ).toThrow(/incompatible/);
  expect(() =>
    validateSceneModels(
      { ...scene, elements: [{ ...scene.elements[0]!, animation: "Walking" }] },
      models,
    ),
  ).toThrow(/unavailable/);
});
it("validates cached stills and GLBs against their hash identities", () => {
  const digest = "a".repeat(64),
    id = `upload.${digest}`;
  const image = {
    id,
    type: "image",
    path: `media/${id}.webp`,
    alt: "Knight",
    scene3d: scene,
    upload: { digest, mime: "image/webp", size: 42, rights: "Own work" },
  };
  expect(RuntimeAssetSchema.safeParse(image).success).toBe(true);
  expect(RuntimeAssetSchema.safeParse({ ...image, path: "media/other.webp" }).success).toBe(false);
  expect(
    RuntimeAssetSchema.safeParse({ ...image, upload: { ...image.upload, size: 10_000_001 } })
      .success,
  ).toBe(false);
  expect(CinematicSchema.parse(scene.cinematic)).toEqual(scene.cinematic);
});
