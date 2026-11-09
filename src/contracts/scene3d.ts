import { z } from "zod";
import { CinematicSchema } from "./cinematic.ts";

const sceneLayers = ["main", "background", "midground", "foreground"] as const;
const illustrationStyles = [
  "toon",
  "painterly",
  "sketch",
  "sketch-color",
  "gradient",
  "poster",
  "rim",
  "halftone",
  "hatching",
  "glossy",
] as const;
const VectorSchema = z
  .object({
    x: z.number().finite().min(-100).max(100),
    y: z.number().finite().min(-100).max(100),
    z: z.number().finite().min(-100).max(100),
  })
  .strict();
export const Model3DSchema = z
  .object({
    category: z.enum(["character", "architecture", "environment", "nature", "object"]),
    roles: z.array(z.enum(sceneLayers)).min(1).max(4),
    dimensions: z
      .object({
        x: z.number().nonnegative().max(100000),
        y: z.number().nonnegative().max(100000),
        z: z.number().nonnegative().max(100000),
      })
      .strict()
      .refine((size) => size.x + size.y + size.z > 0.0001, "Model must have visible dimensions"),
    animations: z.array(z.string().min(1).max(100)).max(32),
    palette: z.enum(["environment", "character"]).optional(),
  })
  .strict();
export const Scene3DSchema = z
  .object({
    version: z.literal(1),
    title: z.string().trim().min(1).max(100),
    style: z.enum(illustrationStyles),
    environment: z.enum(["village", "forest"]).optional(),
    camera: z
      .object({ position: VectorSchema, target: VectorSchema, fov: z.number().min(20).max(90) })
      .strict()
      .refine(
        (camera) =>
          Math.hypot(
            camera.position.x - camera.target.x,
            camera.position.y - camera.target.y,
            camera.position.z - camera.target.z,
          ) >= 0.2,
        "Camera must be away from its target",
      )
      .optional(),
    blendMode: z.enum(["soft", "atmospheric", "none"]).optional(),
    pageEdges: z.enum(["none", "leaves", "grass"]).optional(),
    elements: z
      .array(
        z
          .object({
            assetId: z.string().regex(/^[a-z][a-z0-9.-]*$/),
            layer: z.enum(sceneLayers),
            animation: z.string().max(100).optional(),
            visible: z.boolean().optional(),
            transform: z
              .object({
                position: VectorSchema,
                rotation: z
                  .object({
                    x: z.number().finite().min(-180).max(180),
                    y: z.number().finite().min(-180).max(180),
                    z: z.number().finite().min(-180).max(180),
                  })
                  .strict(),
                scale: z.number().finite().min(0.25).max(3),
              })
              .strict()
              .optional(),
          })
          .strict(),
      )
      .min(1)
      .max(12),
    position: z.enum(["left", "center", "right"]),
    shot: z.enum(["close", "medium", "wide"]),
    ambience: z.enum(["daylight", "golden-hour", "moonlight", "mist"]),
    particles: z.enum(["none", "dust"]),
    blend: z.boolean(),
    cinematic: CinematicSchema,
  })
  .strict()
  .superRefine((scene, context) => {
    const limits = { main: 2, background: 3, midground: 4, foreground: 3 };
    for (const layer of sceneLayers)
      if (scene.elements.filter((element) => element.layer === layer).length > limits[layer])
        context.addIssue({
          code: "custom",
          message: `Too many ${layer} elements (maximum ${limits[layer]})`,
        });
  });
export type Scene3D = z.infer<typeof Scene3DSchema>;
export type Model3D = z.infer<typeof Model3DSchema>;

export function validateSceneModels(scene: Scene3D, models: Map<string, { model3d?: Model3D }>) {
  for (const element of scene.elements) {
    const model = models.get(element.assetId)?.model3d;
    if (!model || !model.roles.includes(element.layer))
      throw new Error(`Model is incompatible with ${element.layer}: ${element.assetId}`);
    if (element.animation && !model.animations.includes(element.animation))
      throw new Error(`Animation is unavailable: ${element.animation}`);
  }
}

export function inspectGlb(bytes: Uint8Array) {
  if (bytes.byteLength < 28 || bytes.byteLength > 20_000_000)
    throw new Error("Use a self-contained GLB up to 20 MB.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    view.getUint32(0, true) !== 0x46546c67 ||
    view.getUint32(4, true) !== 2 ||
    view.getUint32(8, true) !== bytes.length ||
    view.getUint32(16, true) !== 0x4e4f534a
  )
    throw new Error("Invalid GLB 2.0 container.");
  const length = view.getUint32(12, true);
  if (length > 2_000_000 || length + 20 > bytes.length) throw new Error("Invalid GLB metadata.");
  const data = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + length)));
  const json = GltfJsonSchema.parse(data);
  for (const resource of [...json.buffers, ...json.images])
    if (resource.uri && !/^data:[a-z0-9/+.-]+;base64,[a-zA-Z0-9+/]+=*$/.test(resource.uri))
      throw new Error("GLB resources must be embedded; external URLs are not allowed.");
  if (json.extensionsRequired.some((name) => /draco|meshopt|basisu/.test(name)))
    throw new Error(
      "Export an uncompressed GLB with embedded PNG/JPEG textures for this experiment.",
    );
  const vertices = json.meshes
    .flatMap((mesh) => mesh.primitives)
    .reduce(
      (sum, primitive) => sum + (json.accessors[primitive.attributes.POSITION]?.count ?? 250001),
      0,
    );
  if (vertices > 250000) throw new Error("Reduce the model to at most 250,000 vertices.");
  checkHierarchy(json.nodes);
  return data;
}

const GltfJsonSchema = z.object({
  asset: z.object({ version: z.literal("2.0") }),
  buffers: z.array(z.object({ uri: z.string().optional() })).default([]),
  images: z.array(z.object({ uri: z.string().optional() })).default([]),
  nodes: z
    .array(z.object({ children: z.array(z.number().int().nonnegative()).optional() }))
    .max(500)
    .default([]),
  accessors: z
    .array(z.object({ count: z.number().int().nonnegative() }))
    .max(2000)
    .default([]),
  meshes: z
    .array(
      z.object({
        primitives: z.array(
          z.object({ attributes: z.object({ POSITION: z.number().int().nonnegative() }) }),
        ),
      }),
    )
    .max(200),
  extensionsRequired: z.array(z.string()).default([]),
});

/** Rejects cycles, dangling children and hierarchies deeper than 64 levels. */
function checkHierarchy(nodes: z.infer<typeof GltfJsonSchema>["nodes"]) {
  const depths = new Map<number, number>();
  const visit = (at: number, parents: Set<number>): number => {
    if (!nodes[at] || parents.has(at)) throw new Error("Invalid model hierarchy.");
    if (depths.has(at)) return depths.get(at)!;
    if (parents.size > 64) throw new Error("Model hierarchy exceeds 64 levels.");
    const next = new Set(parents).add(at);
    const depth =
      1 + Math.max(0, ...(nodes[at]!.children ?? []).map((child) => visit(child, next)));
    if (depth > 64) throw new Error("Model hierarchy exceeds 64 levels.");
    depths.set(at, depth);
    return depth;
  };
  nodes.forEach((_, at) => visit(at, new Set()));
}
