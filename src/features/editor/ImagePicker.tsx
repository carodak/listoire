import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { StoryProject } from "../../contracts/editor-project.ts";
import type { MediaAsset } from "../../contracts/presentation.ts";
import { CloseButton } from "../../shared/CloseButton.tsx";
import { arrowKeyTabs } from "../../shared/tab-keys.ts";
import { matchesLibraryAsset, VisualPreview } from "./MediaLibrary.tsx";

type Language = StoryProject["languages"][string];
type Entry = NonNullable<StoryProject["mediaLibrary"]>[number];
type Role = "background" | "midground" | "foreground";
const anyFacet = { category: "", theme: "", usage: "" };
const tabs = ["inStory", "library"] as const;
type Tab = (typeof tabs)[number];
const depths = ["", "foreground", "midground", "background"] as const;

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

/**
 * Two tabs, the pictures in this story and the library, each filtered by depth; search, then
 * one click on a picture chooses it.
 */
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
  const id = useId();
  const [search, setSearch] = useState("");
  const [depth, setDepth] = useState<(typeof depths)[number]>("");
  const catalogue = new Map(library.map((entry) => [entry.id, entry]));
  const used = storyPictures(language);
  const [tab, setTab] = useState<Tab>(used.size ? "inStory" : "library");
  const fits = (asset: MediaAsset) =>
    !role || Boolean(catalogue.get(asset.id)?.layerRoles?.includes(role));
  const lists = (text: string) => {
    const found = (language.configuration.assets ?? [])
      .filter((asset) =>
        matchesLibraryAsset(asset, catalogue.get(asset.id), "image", depth, text, anyFacet),
      )
      // Pictures made for this depth first.
      .sort((a, b) => Number(fits(b)) - Number(fits(a)));
    return {
      inStory: found.filter((asset) => used.has(asset.id)),
      library: found.filter((asset) => !used.has(asset.id)),
    };
  };
  const shown = lists(search)[tab];
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
        onChange={(event) => {
          const text = event.target.value;
          setSearch(text);
          // Nothing here but something in the other tab: show that tab.
          const next = lists(text);
          const other = tab === "inStory" ? "library" : "inStory";
          if (!next[tab].length && next[other].length) setTab(other);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
        }}
      />
      <div role="tablist" className="image-picker-tabs" onKeyDown={arrowKeyTabs(tabs, tab, setTab)}>
        {tabs.map((name) => (
          <button
            type="button"
            role="tab"
            key={name}
            id={`${id}-${name}`}
            aria-selected={tab === name}
            aria-controls={`${id}-panel`}
            tabIndex={tab === name ? 0 : -1}
            onClick={() => setTab(name)}
          >
            {t(`editor.image.picker.${name}`)}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${tab}`}>
        <div
          className="image-picker-depths"
          role="group"
          aria-label={t("editor.image.picker.depth")}
        >
          {depths.map((value) => (
            <button
              type="button"
              key={value || "all"}
              aria-pressed={depth === value}
              onClick={() => setDepth(value)}
            >
              {t(value ? `editor.image.depth.${value}` : "editor.image.picker.all")}
            </button>
          ))}
        </div>
        {shown.length ? (
          <div className="image-picker-grid">
            {shown.map((asset) => (
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
        ) : (
          <p>{t("editor.image.picker.none")}</p>
        )}
      </div>
    </section>
  );
}
