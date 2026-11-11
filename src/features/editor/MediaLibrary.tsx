import { storyFileUrl } from "../../contracts/app-path.ts";
import { useAssetSource } from "../presentation/use-asset-source.ts";
import { useEffect, useRef, useState } from "react";
import type { StoryProject } from "../../contracts/editor-project.ts";
import { EditorDialog } from "./EditorDialog.tsx";
import { resolveMediaAsset } from "../../persistence/media-store.ts";
import type { MediaAsset } from "../../contracts/presentation.ts";
import { Field, SelectField } from "./Fields.tsx";
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
}

function MediaLibrary({ language, library, kind, onChoose, onClose, role }: MediaLibraryProps) {
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
  const catalogue = new Map(library.map((entry) => [entry.id, entry]));
  const assets = (language.configuration.assets ?? []).filter((asset) =>
    matchesLibraryAsset(asset, catalogue.get(asset.id), kind, selectedRole, search, filters),
  );
  const content = (
    <div ref={root} className="media-library">
      <Field
        label="Search media"
        autoFocus
        type="search"
        placeholder="Name, theme, description, usage…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <LibraryFilters {...{ kind, library, selectedRole, setSelectedRole, filters, setFilters }} />
      <p>{assets.length} media · licensed story resources</p>
      <div className="media-library-grid">
        {assets.map((asset) => (
          <MediaCard
            key={asset.id}
            asset={asset}
            entry={catalogue.get(asset.id)}
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
  );
  return (
    <EditorDialog title="Media library" onClose={onClose}>
      {content}
    </EditorDialog>
  );
}
export function matchesLibraryAsset(
  asset: MediaAsset,
  meta: Entry | undefined,
  kind: MediaLibraryProps["kind"],
  selectedRole: string,
  search: string,
  filters: Filters,
) {
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
    (!selectedRole ||
      !meta?.layerRoles?.length ||
      meta.layerRoles.some((role) => role === selectedRole)) &&
    searchable(text).includes(searchable(search)) &&
    (["category", "theme", "usage"] as const).every(
      (facet) => !filters[facet] || Boolean(meta && values(meta, facet).includes(filters[facet])),
    )
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
        <SelectField
          label="Depth layer"
          aria-label="Library depth layer"
          value={selectedRole}
          onChange={setSelectedRole}
          options={["", "background", "midground", "foreground"] as const}
          labels={{ "": "All layers" }}
        />
      )}
      {(["category", "theme", "usage"] as const).map((facet) => (
        <SelectField
          key={facet}
          label={facet}
          aria-label={`Media ${facet}`}
          value={filters[facet]}
          onChange={(value) => setFilters({ ...filters, [facet]: value })}
          options={["", ...new Set(library.flatMap((entry) => values(entry, facet)))].sort()}
          labels={{ "": "All" }}
        />
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
        <audio controls preload="none" src={audio ?? storyFileUrl("house", asset.path)} />
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
}

export function MediaPicker({ language, library, kind, asset, onAsset }: MediaPickerProps) {
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
      {selected && ["image", "video"].includes(selected.type) && <VisualPreview asset={selected} />}
      {open && (
        <MediaLibrary
          language={language}
          library={library}
          kind={mediaTypes[kind] ?? "audio"}
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
