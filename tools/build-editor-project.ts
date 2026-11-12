import { writeBundle } from "./write-bundle.ts";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
import type { StoryBundle } from "../src/contracts/story.ts";
import { compileProject } from "../src/features/editor/compiler.ts";
import { BundleSchema } from "../src/contracts/story.ts";
import { splitStoryArchive, decodeUploadedFile } from "../src/contracts/story-archive.ts";
import { verifyUploadedMedia } from "../src/contracts/uploaded-media.ts";
import { storyAssetIds } from "../src/contracts/story-assets.ts";

interface CuratedAsset {
  id: string;
  optimizedPath: string;
  runtimePath?: string;
  runtimeSha256: string;
  originalPath: string;
  mediaType: string;
  rights: { officialStoryUse: string };
}
function assetSource(
  asset: NonNullable<StoryBundle["assets"]>[number],
  bundle: StoryBundle,
  entries: CuratedAsset[],
) {
  const entry = entries.find((entry) => entry.id === asset.id);
  if (entry) {
    if (entry.rights.officialStoryUse !== "allowed")
      throw new Error(`Unlicensed editor asset ${asset.id}`);
    if (entry.mediaType !== asset.type) throw new Error(`Asset type mismatch: ${asset.id}`);
    if (
      asset.type === "image" &&
      (!entry.originalPath.startsWith("assets/images/") ||
        entry.originalPath.startsWith("assets/images/reference-house/"))
    )
      throw new Error(`House image is not from the downloaded library: ${asset.id}`);
    if ((entry.runtimePath ?? entry.optimizedPath.replace("stories/house/", "")) !== asset.path)
      throw new Error(`Asset path mismatch: ${asset.id}`);
    return { source: entry.optimizedPath, expected: entry.runtimeSha256 };
  }
  const clip = bundle.narration?.find((clip) => clip.assetId === asset.id);
  if (
    !clip ||
    !/^narration\.[a-f0-9]{64}$/.test(asset.id) ||
    asset.path !== `media/${asset.id}.mp3`
  )
    throw new Error(`Unverified editor asset ${asset.id}`);
  return { source: `stories/house/${asset.path}`, expected: clip.audioDigest };
}

export async function buildEditorProject(root: URL) {
  const { project, uploadedFiles } = splitStoryArchive(
    JSON.parse(await readFile(new URL("stories/house/project.json", root), "utf8")),
  );
  const curated = JSON.parse(await readFile(new URL("assets/catalog/curated.json", root), "utf8"));
  project.mediaLibrary = curated.entries.map(libraryEntry);
  const bundles = await compileProject(project);
  const publication = await readPublication(root);
  const output = new URL("public/stories/house/", root);
  await mkdir(new URL("media/", output), { recursive: true });
  const copied = new Map<string, string>();
  const referenced = new Set<string>();
  for (const [locale, original] of Object.entries(bundles)) {
    const full =
      publication?.inkDigests[locale] === original.inkDigest
        ? mergeGeneratedClips(original, publication.clips)
        : original;
    project.languages[locale]!.configuration.narration = full.narration;
    project.languages[locale]!.configuration.assets = full.assets;
    const references = storyAssetIds(full);
    const bundle = BundleSchema.parse({
      ...full,
      assets: full.assets?.filter((asset) => references.has(asset.id)),
    });
    await copyAssets(bundle, root, output, curated.entries, copied, referenced, uploadedFiles);
    await writeBundle(output, bundle);
  }
  await writeFile(new URL("project.json", output), JSON.stringify(project) + "\n");
  await writeFile(
    new URL("manifest.json", output),
    JSON.stringify({
      schemaVersion: 1,
      storyId: project.storyId,
      defaultLocale: project.defaultLocale,
      locales: Object.keys(project.languages),
    }) + "\n",
  );
  for (const file of await readdir(new URL("media/", output)))
    if (/^[a-z0-9.-]+\.(webp|mp3|mp4|webm|glb)$/.test(file) && !referenced.has(file))
      await rm(new URL(`media/${file}`, output));
  // The copies kept beside the story follow it too, unless a copy is the library file's source.
  for (const entry of curated.entries as CuratedAsset[]) {
    const path = entry.runtimePath ?? entry.optimizedPath.replace("stories/house/", "");
    if (!referenced.has(path.slice("media/".length)) && !entry.optimizedPath.startsWith("stories/"))
      await rm(new URL(`stories/house/${path}`, root), { force: true });
  }
}

function libraryEntry(entry: {
  id: string;
  title: string;
  sourceCollection: string;
  category?: string;
  suggested: { themes: string[]; roles: string[]; layerRoles?: string[] };
}) {
  return {
    id: entry.id,
    title: entry.title,
    category: entry.category ?? entry.sourceCollection,
    themes: entry.suggested.themes,
    usage: entry.suggested.roles,
    layerRoles: entry.suggested.layerRoles,
  };
}

/** Published narration is optional; only a missing file means "none yet". */
function readPublication(root: URL) {
  return readFile(new URL("stories/house/narration.json", root), "utf8")
    .then(JSON.parse)
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
      return null;
    });
}

function mergeGeneratedClips(
  bundle: StoryBundle,
  entries: { clip: NonNullable<StoryBundle["narration"]>[number] }[],
) {
  const narration = new Map(
    bundle.narration?.map((clip) => [`${clip.segmentId}:${clip.voiceId}`, clip]),
  );
  const oldIds = new Set(bundle.narration?.map((clip) => clip.assetId));
  const assets = new Map(bundle.assets?.map((asset) => [asset.id, asset]));
  for (const { clip } of entries.filter((entry) => entry.clip.locale === bundle.locale)) {
    const key = `${clip.segmentId}:${clip.voiceId}`;
    const current = narration.get(key);
    if (
      current?.approval.status === "approved" ||
      (current && bundle.embeddedAudio?.[current.assetId])
    )
      continue;
    if (current?.audioDigest === clip.audioDigest && current.assetId === clip.assetId) continue;
    narration.set(key, clip);
    assets.set(clip.assetId, {
      id: clip.assetId,
      path: `media/${clip.assetId}.mp3`,
      type: "audio",
      alt: "",
    });
  }
  const retained = new Set([...narration.values()].map((clip) => clip.assetId));
  return BundleSchema.parse({
    ...bundle,
    narration: [...narration.values()],
    assets: [...assets.values()].filter((asset) => !oldIds.has(asset.id) || retained.has(asset.id)),
  });
}

async function copyAssets(
  bundle: StoryBundle,
  root: URL,
  output: URL,
  entries: CuratedAsset[],
  copied: Map<string, string>,
  referenced: Set<string>,
  uploadedFiles: Record<string, string>,
) {
  for (const asset of bundle.assets ?? []) {
    if (bundle.embeddedAudio?.[asset.id]) continue;
    if (asset.upload) {
      const data = uploadedFiles[asset.id];
      if (!data) throw new Error(`Missing uploaded media bytes: ${asset.id}`);
      const blob = await verifyUploadedMedia(asset, decodeUploadedFile(asset, data));
      await writeFile(new URL(asset.path, output), new Uint8Array(await blob.arrayBuffer()));
      referenced.add(asset.path.slice("media/".length));
      continue;
    }
    const { source, expected } = assetSource(asset, bundle, entries);
    const signature = `${asset.path}:${expected}`;
    if (copied.get(asset.id) === signature) continue;
    if (copied.has(asset.id)) throw new Error(`Localized asset identity mismatch: ${asset.id}`);
    // The library cache is local and ignored; a fresh checkout builds from the copy kept
    // beside the story, which every build with the cache refreshes.
    const kept = new URL(`stories/house/${asset.path}`, root);
    const cached = await readFile(new URL(source, root)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
      return null;
    });
    const bytes = cached ?? (await readFile(kept));
    if (createHash("sha256").update(bytes).digest("hex") !== expected)
      throw new Error(`Stale editor asset ${asset.id}`);
    if (cached && kept.href !== new URL(source, root).href) {
      await mkdir(new URL("./", kept), { recursive: true });
      await writeFile(kept, bytes);
    }
    await writeFile(new URL(asset.path, output), bytes);
    copied.set(asset.id, signature);
    referenced.add(asset.path.slice("media/".length));
  }
}
