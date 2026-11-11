import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { StoryProject } from "../../contracts/editor-project.ts";
import type { MediaAsset } from "../../contracts/presentation.ts";
import { CloseButton } from "../../shared/CloseButton.tsx";
import { matchesLibraryAsset, VisualPreview } from "./MediaLibrary.tsx";

type Language = StoryProject["languages"][string];
type Entry = NonNullable<StoryProject["mediaLibrary"]>[number];
type Role = "background" | "midground" | "foreground";
const anyFacet = { category: "", theme: "", usage: "" };

/** A picture's short name: its catalogue title, else its description. */
export function pictureTitle(id: string, assets: MediaAsset[], library: Entry[]) {
  return (
    library.find((entry) => entry.id === id)?.title ?? assets.find((a) => a.id === id)?.alt ?? id
  );
}

/** Pictures the story already shows (main pictures and layers), for quick reuse. */
function storyPictures(language: Language) {
  const ids = new Set<string>();
  for (const scene of Object.values(language.configuration.scenes ?? {}))
    for (const block of scene.blocks ?? [])
      if (block.kind === "media") {
        ids.add(block.image);
        block.illustration?.layers.forEach((layer) => ids.add(layer.image));
      }
  return ids;
}

/** Search, then one click on a picture chooses it: pictures in this story first, then the library. */
export function ImagePicker({
  title,
  role,
  language,
  library,
  onChoose,
  onClose,
}: {
  title: string;
  role?: Role;
  language: Language;
  library: Entry[];
  onChoose: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const catalogue = new Map(library.map((entry) => [entry.id, entry]));
  const used = storyPictures(language);
  const fits = (asset: MediaAsset) =>
    !role || Boolean(catalogue.get(asset.id)?.layerRoles?.includes(role));
  const found = (language.configuration.assets ?? [])
    .filter((asset) =>
      matchesLibraryAsset(asset, catalogue.get(asset.id), "image", "", search, anyFacet),
    )
    // Pictures made for this depth first.
    .sort((a, b) => Number(fits(b)) - Number(fits(a)));
  const groups = [
    { name: t("editor.image.picker.inStory"), assets: found.filter((asset) => used.has(asset.id)) },
    {
      name: t("editor.image.picker.library"),
      assets: found.filter((asset) => !used.has(asset.id)),
    },
  ];
  return (
    <section className="image-picker" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <CloseButton label={t("editor.image.picker.close")} onClick={onClose} />
      </header>
      <input
        type="search"
        autoFocus
        aria-label={t("editor.image.picker.search")}
        placeholder={t("editor.image.picker.search")}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
        }}
      />
      {groups.map(
        (group) =>
          group.assets.length > 0 && (
            <div key={group.name} role="group" aria-label={group.name}>
              <h4>{group.name}</h4>
              <div className="image-picker-grid">
                {group.assets.map((asset) => (
                  <button
                    type="button"
                    key={asset.id}
                    data-asset={asset.id}
                    title={asset.alt}
                    onClick={() => onChoose(asset.id)}
                  >
                    <VisualPreview asset={asset} />
                    <span>{pictureTitle(asset.id, [asset], library)}</span>
                  </button>
                ))}
              </div>
            </div>
          ),
      )}
      {!found.length && <p>{t("editor.image.picker.none")}</p>}
    </section>
  );
}
