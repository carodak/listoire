import type { StoryProject } from "../../contracts/editor-project.ts";

export function addIllustrationLibrary(project: StoryProject, source: StoryProject | null) {
  if (!source) return project;
  const next = structuredClone(project);
  const { mediaLibrary = [] } = source;
  const catalogue = new Map(mediaLibrary.map((entry) => [entry.id, entry]));
  for (const [locale, language] of Object.entries(next.languages)) {
    const available = source.languages[locale] ?? source.languages[source.defaultLocale]!;
    language.defaults.dropCapColor ??= available.defaults.dropCapColor;
    const { assets = [] } = language.configuration;
    const { assets: supplied = [] } = available.configuration;
    const ids = new Set(assets.map((asset) => asset.id));
    language.configuration.assets = [
      ...assets,
      ...supplied.filter((asset) => catalogue.has(asset.id) && !ids.has(asset.id)),
    ];
  }
  const available = new Set(
    Object.values(next.languages).flatMap(({ configuration: { assets = [] } }) =>
      assets.map((asset) => asset.id),
    ),
  );
  next.mediaLibrary = [...catalogue.values()].filter((entry) => available.has(entry.id));
  return next;
}

/** What the author wrote on a sample picture: a new pack keeps it. */
const authored = ["caption", "photograph", "examination"] as const;

export function applyIllustrationPack(project: StoryProject, source: StoryProject) {
  const next = addIllustrationLibrary(project, source);
  for (const [locale, language] of Object.entries(next.languages)) {
    const available = source.languages[locale] ?? source.languages[source.defaultLocale]!;
    for (const [id, scene] of Object.entries(language.configuration.scenes ?? {})) {
      const replacement = available.configuration.scenes?.[id];
      if (!replacement?.blocks) continue;
      const replaced = new Set<string>();
      scene.blocks = scene.blocks?.map((block) => {
        if (block.kind !== "media" || block.image.startsWith("upload.")) return block;
        const updated = replacement.blocks!.find(
          (item) => item.kind === "media" && item.id === block.id,
        );
        if (updated?.kind !== "media") return block;
        replaced.add(block.id);
        if (scene.image === block.image) scene.image = updated.image;
        const next = structuredClone(updated);
        for (const key of authored)
          if (block[key] === undefined) delete next[key];
          else Object.assign(next, { [key]: block[key] });
        return next;
      });
      scene.events = [
        ...(scene.events ?? []).filter(
          (event) => !(event.action.kind === "effect" && replaced.has(event.blockId ?? "")),
        ),
        ...(replacement.events ?? []).filter((event) => replaced.has(event.blockId ?? "")),
      ];
    }
    language.defaults.backgroundColor = available.defaults.backgroundColor;
  }
  return next;
}
