import { useState } from "react";
import { RuntimeAssetSchema } from "../../contracts/presentation.ts";
import type { MediaAsset } from "../../contracts/presentation.ts";
import { storeUploadedMedia } from "../../persistence/media-store.ts";
import { audioDuration } from "./narration-authoring.ts";
import { DurationField } from "./DurationField.tsx";
import { sha256 } from "../../contracts/digest.ts";
import { Field, uploadChosenFile } from "./Fields.tsx";
export function VideoUpload({ onUpload }: { onUpload: (asset: MediaAsset) => void }) {
  const [draft, setDraft] = useState({ rights: "", error: "", busy: false, duration: 0 });
  async function upload(file: File) {
    try {
      if (file.size > 50_000_000 || !/\.(mp4|webm)$/i.test(file.name))
        throw new Error("Use an MP4 or WebM up to 50 MB.");
      if (!draft.rights.trim()) throw new Error("Confirm permission to use this video first.");
      setDraft({ ...draft, busy: true, error: "" });
      onUpload(await storeVideo(file, draft.rights, draft.duration));
      setDraft({ ...draft, busy: false, error: "" });
    } catch (error) {
      setDraft({
        ...draft,
        busy: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return (
    <fieldset>
      <legend>Upload video</legend>
      <Field
        label="Video permission / rights"
        maxLength={500}
        value={draft.rights}
        onChange={(event) => setDraft({ ...draft, rights: event.target.value })}
      />
      <DurationField
        label="Video duration in seconds (optional override)"
        min={0.01}
        max={86400}
        value={draft.duration}
        onChange={(duration) => setDraft({ ...draft, duration })}
        help="Leave blank for automatic duration. If this browser cannot decode the video, enter its duration to edit and back it up; playback still needs a compatible codec."
      />
      <Field
        label="Video file (MP4 / WebM, max 50 MB)"
        type="file"
        accept="video/mp4,video/webm,.mp4,.webm"
        disabled={draft.busy}
        onChange={uploadChosenFile(upload)}
      />
      {draft.busy && <p role="status">Verifying and storing video…</p>}
      {draft.error && <p role="alert">{draft.error}</p>}
      <p>
        Videos stay in this browser until included in a complete project backup. Playback depends on
        the browser's codecs.
      </p>
    </fieldset>
  );
}

async function storeVideo(file: File, rights: string, durationOverride: number) {
  const mime = /\.webm$/i.test(file.name) ? "video/webm" : "video/mp4";
  const url = URL.createObjectURL(file);
  let durationMs: number;
  try {
    durationMs = durationOverride * 1000 || (await audioDuration(url, "video"));
    if (durationMs <= 0) throw new Error("This video has no playable duration.");
  } finally {
    URL.revokeObjectURL(url);
  }
  const hex = await sha256(await file.arrayBuffer());
  const id = `upload.${hex}`;
  const asset = RuntimeAssetSchema.parse({
    id,
    path: `media/${id}.${mime === "video/mp4" ? "mp4" : "webm"}`,
    type: "video",
    alt: file.name,
    upload: { digest: hex, mime, size: file.size, rights, durationMs },
  });
  await storeUploadedMedia(asset, new Blob([file], { type: mime }));
  return asset;
}
