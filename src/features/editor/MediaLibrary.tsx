import { useAssetSource } from "../presentation/use-asset-source.ts";
import { useEffect, useRef, useState } from "react";
import type { StoryProject } from "../../contracts/editor-project.ts";
import { EditorDialog } from "./EditorDialog.tsx";
import { resolveMediaAsset } from "../../persistence/media-store.ts";
import type { MediaAsset } from "../../contracts/uploaded-media.ts";
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
interface MediaLibraryProps {
  language: Language;
  library: Entry[];
  kind: "image" | "audio" | "video" | "scene3d";
  onChoose: (id: string) => void;
  onClose: () => void;
  role?: "foreground" | "midground" | "background";
  embedded?: boolean;
}

export function MediaLibrary({
  language,
  library,
  kind,
  onChoose,
  onClose,
  role,
  embedded = false,
}: MediaLibraryProps) {
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<"" | "foreground" | "midground" | "background">(
    role ?? "",
  );
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
      Boolean(meta || asset.upload || asset.id.startsWith("recording.")) &&
      (kind === "scene3d" ? Boolean(asset.scene3d) : asset.type === kind) &&
      (!selectedRole || !meta?.layerRoles?.length || meta.layerRoles.includes(selectedRole)) &&
      searchable(text).includes(searchable(search)) &&
      (["category", "theme", "usage"] as const).every(
        (facet) => !filters[facet] || Boolean(meta && values(meta, facet).includes(filters[facet])),
      )
    );
  });
  const content = (
    <>
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
        <LibraryFilters
          kind={kind}
          library={library}
          selectedRole={selectedRole}
          setSelectedRole={setSelectedRole}
          filters={filters}
          setFilters={setFilters}
        />
        <p>{assets.length} media · licensed story resources</p>
        <div className="media-library-grid">
          {assets.map((asset) => (
            <MediaCard
              key={asset.id}
              asset={asset}
              entry={library.find((entry) => entry.id === asset.id)}
              audio={language.configuration.embeddedAudio?.[asset.id]}
              kind={kind}
              onChoose={(id) => {
                onChoose(id);
                onClose();
              }}
            />
          ))}
        </div>
        {!assets.length && <p>No media match this search.</p>}
      </div>
    </>
  );
  return embedded ? (
    <section className="embedded-media-library" aria-label="Media library">
      <header>
        <strong>Media library</strong>
        <button type="button" onClick={onClose} aria-label="Close gallery">
          Close gallery
        </button>
      </header>
      {content}
    </section>
  ) : (
    <EditorDialog title="Media library" onClose={onClose}>
      {content}
    </EditorDialog>
  );
}
type Filters = Record<Facet, string>;
function LibraryFilters({
  kind,
  library,
  selectedRole,
  setSelectedRole,
  filters,
  setFilters,
}: {
  kind: MediaLibraryProps["kind"];
  library: Entry[];
  selectedRole: "" | "foreground" | "midground" | "background";
  setSelectedRole: (role: "" | "foreground" | "midground" | "background") => void;
  filters: Filters;
  setFilters: (filters: Filters) => void;
}) {
  return (
    <div className="asset-filters">
      {kind === "image" && (
        <label>
          Depth layer
          <select
            aria-label="Library depth layer"
            value={selectedRole}
            onChange={(event) => setSelectedRole(event.target.value as typeof selectedRole)}
          >
            <option value="">All layers</option>
            {["background", "midground", "foreground"].map((role) => (
              <option key={role}>{role}</option>
            ))}
          </select>
        </label>
      )}
      {(["category", "theme", "usage"] as const).map((facet) => (
        <label key={facet}>
          {facet}
          <select
            aria-label={`Media ${facet}`}
            value={filters[facet]}
            onChange={(e) => setFilters({ ...filters, [facet]: e.target.value })}
          >
            <option value="">All</option>
            {[...new Set(library.flatMap((entry) => values(entry, facet)))].sort().map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
function MediaCard({
  asset,
  entry,
  audio,
  kind,
  onChoose,
}: {
  asset: MediaAsset;
  entry?: Entry;
  audio?: string;
  kind: MediaLibraryProps["kind"];
  onChoose: (id: string) => void;
}) {
  return (
    <article data-asset={asset.id}>
      {["image", "video"].includes(asset.type) ? (
        <VisualPreview asset={asset} />
      ) : (
        <audio controls preload="none" src={audio ?? `/stories/house/${asset.path}`} />
      )}
      <strong>{entry?.title ?? asset.id}</strong>
      <p>{asset.alt || asset.id}</p>
      {kind === "image" && (
        <p>Parallax layers: {entry?.layerRoles?.join(", ") || "Not reviewed"}</p>
      )}
      <button
        type="button"
        title={`Use ${asset.id} in the story`}
        onClick={() => {
          onChoose(asset.id);
        }}
      >
        Use this media
      </button>
    </article>
  );
}
interface MediaPickerProps {
  language: Language;
  library: Entry[];
  kind: string;
  asset: string;
  onAsset: (id: string) => void;
  embedded?: boolean;
}

export function MediaPicker({
  language,
  library,
  kind,
  asset,
  onAsset,
  embedded = false,
}: MediaPickerProps) {
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
      <p>{selected ? selected.alt || selected.id : "No media selected"}</p>
      {!embedded && selected && ["image", "video"].includes(selected.type) && (
        <VisualPreview asset={selected} />
      )}
      {open && (
        <MediaLibrary
          language={language}
          library={library}
          kind={mediaTypes[kind] ?? "audio"}
          embedded={embedded}
          onChoose={onAsset}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
const resolvePreview = (asset: MediaAsset) => resolveMediaAsset(asset, "house");
export function VisualPreview({ asset }: { asset: MediaAsset }) {
  const url = useAssetSource(asset, resolvePreview);
  if (asset.type === "image")
    return url ? (
      <img className="asset-preview" src={url} alt={asset.alt} loading="lazy" />
    ) : (
      <p>Loading image?</p>
    );
  return url ? (
    <video
      className="asset-preview"
      controls
      preload="metadata"
      src={url}
      aria-label={asset.alt || "Video preview"}
    />
  ) : (
    <p>Video preview unavailable.</p>
  );
}

const mediaTypes: Record<string, "image" | "video" | "audio" | "scene3d"> = {
  Image: "image",
  Video: "video",
  "3D Scene": "scene3d",
};
