import { readFileSync } from "node:fs";
import { StoryProjectSchema } from "../../src/contracts/editor-project.ts";
import { compileProject } from "../../src/features/editor/compiler.ts";
import { illustrationDefaults } from "../../src/contracts/illustration.ts";

export const houseProject = StoryProjectSchema.parse(
  JSON.parse(
    readFileSync(new URL("../../docs/story-editor/original-project.json", import.meta.url), "utf8"),
  ),
);
export const houseBundles = await compileProject(houseProject);

export const refreshedHouseProject = structuredClone(houseProject);
for (const language of Object.values(refreshedHouseProject.languages)) {
  const config = language.configuration;
  const images = [
    "house.night",
    "tcp.human5-cutout",
    "paper.modern-male-character",
    "paper.modern-grandma-character",
  ];
  config.assets!.push(
    ...images.map((id) => ({ id, path: `media/${id}.webp`, type: "image" as const, alt: id })),
  );
  config.character!.portrait = "tcp.human5-cutout";
  language.cover = "house.night";
  config.examination!.image = "house.night";
  Object.assign(config.examination!.hotspot!, { x: 79, y: 41 });
  for (const [id, image] of [
    ["intro", "paper.modern-male-character"],
    ["call", "paper.modern-grandma-character"],
  ])
    config.scenes![id!]!.blocks!.unshift({
      kind: "media",
      id: `${id}.artwork`,
      image: image!,
      layout: "right",
    });
}

// Keep legacy story flows deterministic while exercising the current artwork renderer.
export const browserHouseProject = structuredClone(refreshedHouseProject);
browserHouseProject.mediaLibrary ??= [];
for (const language of Object.values(browserHouseProject.languages)) {
  for (const scene of Object.values(language.configuration.scenes ?? {}))
    for (const block of scene.blocks ?? [])
      if (block.kind === "media" && block.layout === "right")
        block.illustration = illustrationDefaults();
  for (const asset of language.configuration.assets ?? []) {
    if (browserHouseProject.mediaLibrary?.some((entry) => entry.id === asset.id)) continue;
    browserHouseProject.mediaLibrary?.push({
      id: asset.id,
      title: asset.alt || asset.id,
      category: "Illustration",
      themes: [],
      usage: [],
    });
  }
}
