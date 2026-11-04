import type { StoryProject } from "./editor-project.ts";
import { BundleSchema } from "./story.ts";
import type { StoryBundle } from "./story.ts";

const replacements: Record<string, string> = {
  "tcp.human5": "tcp.human8-cutout",
  "shadow.photograph": "tcp.human8-cutout",
  "shadow.woman": "tcp.human8-cutout",
  "shadow.house": "heritage.bird",
  "unsplash.woodland-house": "tcp.human8-cutout",
  "unsplash.hidden-house": "heritage.bird",
};
export function hasLegacyArtwork(value: StoryProject | StoryBundle) {
  const configurations =
    "languages" in value
      ? Object.values(value.languages).map((language) => language.configuration)
      : [value];
  return configurations.some((configuration) =>
    configuration.assets?.some((asset) => asset.id in replacements),
  );
}
export function refreshDefaultArtwork(
  project: StoryProject,
  source: StoryProject | null,
): StoryProject {
  if (!source || !hasLegacyArtwork(project)) return project;
  const next = structuredClone(project);
  for (const [locale, language] of Object.entries(next.languages)) {
    const available = source.languages[locale] ?? source.languages[source.defaultLocale]!;
    refreshLanguage(language, available);
  }
  return next;
}

export function refreshPublishedArtwork(bundle: StoryBundle, source: StoryBundle): StoryBundle {
  if (!hasLegacyArtwork(bundle)) return bundle;
  const copy = structuredClone(bundle);
  const language = { configuration: copy, cover: copy.cover };
  refreshLanguage(language, { configuration: source, cover: source.cover });
  copy.cover = language.cover;
  return BundleSchema.parse(copy);
}

type Language = Pick<StoryProject["languages"][string], "configuration" | "cover">;
const replace = (id: string) => replacements[id] ?? id;

function pageArtwork(language: Language, available: Language) {
  return Object.entries(language.configuration.scenes ?? {}).flatMap(([id, scene]) => {
    if (
      !scene.blocks ||
      scene.blocks.some((block) => block.kind === "media" && block.layout === "right")
    )
      return [];
    const block = available.configuration.scenes?.[id]?.blocks?.find(
      (block) => block.kind === "media" && block.layout === "right",
    );
    return block?.kind === "media" &&
      !scene.blocks.some((existing) => existing.kind === "media" && existing.id === block.id)
      ? [
          {
            scene,
            block,
            event: available.configuration.scenes?.[id]?.events?.find(
              (event) => event.blockId === block.id,
            ),
          },
        ]
      : [];
  });
}

function refreshLanguage(language: Language, available: Language) {
  const assets = language.configuration.assets ?? [];
  const needed = new Set(
    assets.flatMap((asset) => (replacements[asset.id] ? [replace(asset.id)] : [])),
  );
  if (!needed.size) return;
  const cover = language.cover ? replace(language.cover) : available.cover;
  if (cover) needed.add(cover);
  const artwork = pageArtwork(language, available);
  artwork.forEach(({ block }) => needed.add(block.image));
  const supplied = new Map(available.configuration.assets?.map((asset) => [asset.id, asset]));
  if (
    [...needed].some(
      (id) =>
        !supplied.has(id) && !assets.some((asset) => asset.id === id && !(id in replacements)),
    )
  )
    return;
  Object.values(language.configuration.scenes ?? {}).forEach(refreshScene);
  for (const { scene, block, event } of artwork) {
    scene.blocks!.unshift(structuredClone(block));
    if (event && !scene.events?.some((existing) => existing.id === event.id))
      scene.events = [...(scene.events ?? []), structuredClone(event)];
  }
  refreshExamination(language.configuration);
  language.cover = cover;
  language.configuration.assets = [
    ...assets.filter((asset) => !(asset.id in replacements)),
    ...[...needed]
      .filter((id) => !assets.some((asset) => asset.id === id && !(id in replacements)))
      .map((id) => structuredClone(supplied.get(id)!)),
  ];
}
function refreshScene(scene: NonNullable<Language["configuration"]["scenes"]>[string]) {
  if (scene.image) scene.image = replace(scene.image);
  scene.blocks?.forEach((block) => {
    if (block.kind !== "media") return;
    block.image = replace(block.image);
    if (block.motion) block.motion.layers = block.motion.layers.map(replace);
  });
  scene.events?.forEach(({ action }) => {
    if (action.kind === "effect" && "image" in action.effect && action.effect.image)
      action.effect.image = replace(action.effect.image);
  });
}
function refreshExamination(config: Language["configuration"]) {
  if (config.examination && config.examination.image in replacements) {
    config.examination.image = replace(config.examination.image);
    config.examination.hotspot = { ...config.examination.hotspot, x: 82, y: 84 };
  }
  if (config.character) config.character.portrait = replace(config.character.portrait);
}
