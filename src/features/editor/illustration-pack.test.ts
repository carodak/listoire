import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { StoryProjectSchema } from "../../contracts/editor-project.ts";
import { addIllustrationLibrary, applyIllustrationPack } from "./illustration-pack.ts";
import { applyMediaEdit } from "./media-authoring.ts";
import { mediaDefaults } from "./media-form.ts";
import { illustrationDefaults, IllustrationSchema } from "../../contracts/illustration.ts";
import { CinematicSchema } from "../../contracts/cinematic.ts";
import { compileLanguage } from "./compiler.ts";

const project = StoryProjectSchema.parse(
  JSON.parse(
    readFileSync(new URL("../../../public/stories/house/project.json", import.meta.url), "utf8"),
  ),
);
it("adds a supplied gallery without overwriting draft text, images or page preferences", () => {
  const old = structuredClone(project);
  old.languages.en!.script += "\n// Keep my draft";
  old.languages.en!.defaults.backgroundColor = "#112233";
  old.languages.en!.configuration.assets = old.languages.en!.configuration.assets!.filter(
    (asset) => !asset.id.startsWith("paper."),
  );
  const next = addIllustrationLibrary(old, project);
  expect(
    next.languages.en!.configuration.assets!.filter((asset) => asset.id.startsWith("paper.")),
  ).toHaveLength(26);
  expect(next.languages.en!.script).toBe(old.languages.en!.script);
  expect(next.languages.en!.configuration.scenes).toEqual(old.languages.en!.configuration.scenes);
  expect(next.languages.en!.defaults).toEqual(old.languages.en!.defaults);
  expect(addIllustrationLibrary(next, project)).toEqual(next);
  expect(addIllustrationLibrary(old, null)).toBe(old);
});
it("updates matching sample directions without changing Ink, narration or uploaded illustrations", async () => {
  const draft = structuredClone(project);
  draft.languages.en!.script += "\n// Retained note";
  const scene = draft.languages.en!.configuration.scenes!.intro!;
  const block = scene.blocks!.find((block) => block.kind === "media" && block.layout === "right")!;
  if (block.kind !== "media") throw new Error("Expected media");
  block.image = "upload.custom";
  const result = applyIllustrationPack(draft, project);
  expect(result.languages.en!.configuration.scenes!.intro!.blocks).toContainEqual(block);
  expect(result.languages.en!.script).toBe(draft.languages.en!.script);
  expect(result.languages.en!.configuration.narration).toEqual(
    draft.languages.en!.configuration.narration,
  );
  expect(
    result.languages.en!.configuration.scenes!.intro!.events?.filter(
      (event) => event.action.kind === "audio",
    ),
  ).toEqual(scene.events?.filter((event) => event.action.kind === "audio"));
});
it("round-trips layered images, wrapping and camera duration through the existing shared media workflow", async () => {
  const input = mediaDefaults("Image", "intro", "intro.layer-test");
  input.asset = "paper.background-the-plains-forest";
  input.shared = true;
  input.illustration = {
    ...illustrationDefaults(),
    wrap: "right",
    layers: [{ image: "paper.modern-male-character", role: "midground", x: 15, y: 3, scale: 0.8 }],
  };
  input.motion = CinematicSchema.parse({ preset: "gentle-depth", durationMs: 6500 });
  const next = applyMediaEdit(project, "en", input, [], "passage");
  const parsed = StoryProjectSchema.parse(JSON.parse(JSON.stringify(next)));
  for (const locale of ["en", "fr"]) {
    const bundle = await compileLanguage(parsed, locale);
    expect(bundle.scenes!.intro!.blocks).toContainEqual(
      expect.objectContaining({ id: input.id, illustration: input.illustration }),
    );
    expect(bundle.scenes!.intro!.events).toContainEqual(
      expect.objectContaining({
        action: expect.objectContaining({ effect: expect.objectContaining({ duration: 6500 }) }),
      }),
    );
  }
  input.layout = "right";
  const moved = applyMediaEdit(parsed, "en", input, [], "passage");
  expect(moved.languages.en!.configuration.scenes!.intro!.blocks).toContainEqual(
    expect.objectContaining({
      id: input.id,
      illustration: { ...input.illustration, wrap: "none" },
    }),
  );
  input.asset = input.illustration.layers[0]!.image;
  const repeated = applyMediaEdit(parsed, "en", input, [], "passage");
  expect(repeated.languages.en!.configuration.scenes!.intro!.blocks).toContainEqual(
    expect.objectContaining({
      image: input.asset,
      illustration: expect.objectContaining({ layers: input.illustration.layers }),
    }),
  );
});
it("allows independent image instances and rejects unsafe composition values", () => {
  expect(
    illustrationDefaults("background", ["paper.a", "paper.b"]).layers.map((layer) => layer.role),
  ).toEqual(["midground", "foreground"]);
  const layer = { image: "paper.foreground-tree", role: "foreground", x: 0, y: 0, scale: 1 };
  expect(
    IllustrationSchema.safeParse({
      ...illustrationDefaults(),
      layers: [layer, { ...layer, x: 30, rotation: 20 }],
    }).success,
  ).toBe(true);
  expect(
    IllustrationSchema.safeParse({ ...illustrationDefaults(), base: { ...layer, scale: Infinity } })
      .success,
  ).toBe(false);
});
it("holds a fullscreen illustration still when its camera preset is None", async () => {
  const input = mediaDefaults("Image", "intro", "intro.still-film");
  input.asset = "paper.background-city";
  input.layout = "fullscreen";
  input.illustration = illustrationDefaults();
  const next = applyMediaEdit(project, "en", input, [], "passage");
  const bundle = await compileLanguage(next, "en");
  expect(bundle.scenes!.intro!.events).toContainEqual(
    expect.objectContaining({
      blocking: true,
      blockId: input.id,
      action: {
        kind: "effect",
        effect: {
          id: "cinematic-camera",
          duration: 6000,
          cinematic: CinematicSchema.parse({ preset: "none" }),
        },
      },
    }),
  );
});
