import { useEffect, useRef, useState } from "react";
import type { StoryProject } from "../../contracts/editor-project.ts";
import { EditorDialog } from "./EditorDialog.tsx";
type Language = StoryProject["languages"][string];
type Entry = NonNullable<StoryProject["mediaLibrary"]>[number];
type Facet = "category" | "theme" | "usage";
function values(entry: Entry, facet: Facet) {
  return { category: [entry.category], theme: entry.themes, usage: entry.usage }[facet];
}
function searchable(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}
function MediaLibrary({
  language,
  library,
  kind,
  onChoose,
  onClose,
}: {
  language: Language;
  library: Entry[];
  kind: "image" | "audio";
  onChoose: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ category: "", theme: "", usage: "" });
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = root.current;
    return () => node?.querySelectorAll("audio").forEach((audio) => audio.pause());
  }, []);
  const assets = (language.configuration.assets ?? []).filter((asset) => {
    const meta = library.find((entry) => entry.id === asset.id);
    const text = [
      asset.id,
      asset.alt,
      meta?.title,
      meta?.category,
      ...(meta?.themes ?? []),
      ...(meta?.usage ?? []),
    ].join(" ");
    return (
      asset.type === kind &&
      searchable(text).includes(searchable(search)) &&
      (["category", "theme", "usage"] as const).every(
        (facet) => !filters[facet] || Boolean(meta && values(meta, facet).includes(filters[facet])),
      )
    );
  });
  return (
    <EditorDialog title="Media library" onClose={onClose}>
      <div ref={root} className="media-library">
        <label>
          Search media
          <input
            autoFocus
            type="search"
            placeholder="Name, theme, description, usage…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="asset-filters">
          {(["category", "theme", "usage"] as const).map((facet) => (
            <label key={facet}>
              {facet}
              <select
                aria-label={`Media ${facet}`}
                value={filters[facet]}
                onChange={(e) => setFilters({ ...filters, [facet]: e.target.value })}
              >
                <option value="">All</option>
                {[...new Set(library.flatMap((entry) => values(entry, facet)))]
                  .sort()
                  .map((value) => (
                    <option key={value}>{value}</option>
                  ))}
              </select>
            </label>
          ))}
        </div>
        <p>{assets.length} media · licensed story resources</p>
        <div className="media-library-grid">
          {assets.map((asset) => (
            <article key={asset.id}>
              {kind === "image" ? (
                <img src={`/stories/house/${asset.path}`} alt={asset.alt} loading="lazy" />
              ) : (
                <audio
                  controls
                  preload="none"
                  src={
                    language.configuration.embeddedAudio?.[asset.id] ??
                    `/stories/house/${asset.path}`
                  }
                />
              )}
              <strong>{library.find((entry) => entry.id === asset.id)?.title ?? asset.id}</strong>
              <p>{asset.alt || asset.id}</p>
              <button
                type="button"
                title={`Use ${asset.id} in the story`}
                onClick={() => {
                  onChoose(asset.id);
                  onClose();
                }}
              >
                Use this media
              </button>
            </article>
          ))}
        </div>
        {!assets.length && <p>No media match this search.</p>}
      </div>
    </EditorDialog>
  );
}
export function MediaPicker({
  language,
  library,
  kind,
  asset,
  onAsset,
}: {
  language: Language;
  library: Entry[];
  kind: string;
  asset: string;
  onAsset: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = language.configuration.assets?.find((entry) => entry.id === asset);
  return (
    <div className="media-picker">
      <input type="hidden" name="asset" value={asset} />
      <button
        type="button"
        title="Browse images or listen to audio before choosing media"
        onClick={() => setOpen(true)}
      >
        ▧ Browse media library
      </button>
      <p>{selected?.alt || selected?.id || "No media selected"}</p>
      {selected?.type === "image" && (
        <img className="asset-preview" src={`/stories/house/${selected.path}`} alt={selected.alt} />
      )}
      {open && (
        <MediaLibrary
          language={language}
          library={library}
          kind={kind === "Image" ? "image" : "audio"}
          onChoose={onAsset}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
