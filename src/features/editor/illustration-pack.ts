import type { StoryProject } from "../../contracts/editor-project.ts";

export function addIllustrationLibrary(project: StoryProject, source: StoryProject | null) {
  if (!source) return project;
  const next = structuredClone(project);
  for (const [locale, language] of Object.entries(next.languages)) {
    const available = source.languages[locale] ?? source.languages[source.defaultLocale]!;
    language.defaults.dropCapColor ??= available.defaults.dropCapColor;
    const ids = new Set(language.configuration.assets?.map((asset) => asset.id));
    language.configuration.assets = [
      ...(language.configuration.assets ?? []),
      ...(available.configuration.assets ?? []).filter(
        (asset) =>
          source.mediaLibrary?.some((entry) => entry.id === asset.id) && !ids.has(asset.id),
      ),
    ];
  }
  const catalogue = new Map(source.mediaLibrary?.map((entry) => [entry.id, entry]));
  const available = new Set(
    Object.values(next.languages).flatMap(
      (language) => language.configuration.assets?.map((asset) => asset.id) ?? [],
    ),
  );
  next.mediaLibrary = [...catalogue.values()].filter((entry) => available.has(entry.id));
  return next;
}

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
        return structuredClone(updated);
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
