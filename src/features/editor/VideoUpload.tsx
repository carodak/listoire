import { useState } from "react";
import { RuntimeAssetSchema } from "../../contracts/presentation.ts";
import type { MediaAsset } from "../../contracts/uploaded-media.ts";
import { storeUploadedMedia } from "../../persistence/media-store.ts";
import { audioDuration } from "./narration-authoring.ts";
import { DurationField } from "./DurationField.tsx";
export function VideoUpload({ onUpload }: { onUpload: (asset: MediaAsset) => void }) {
  const [draft, setDraft] = useState({ rights: "", error: "", busy: false, duration: 0 });
  async function upload(file: File) {
    try {
      if (file.size > 50_000_000 || !/\.(mp4|webm)$/i.test(file.name))
        throw new Error("Use an MP4 or WebM up to 50 MB.");
      if (!draft.rights.trim()) throw new Error("Confirm permission to use this video first.");
      setDraft({ ...draft, busy: true, error: "" });
      const mime = /\.webm$/i.test(file.name) ? "video/webm" : "video/mp4";
      const url = URL.createObjectURL(file);
      let durationMs: number;
      try {
        durationMs = draft.duration * 1000 || (await audioDuration(url, "video"));
        if (durationMs <= 0) throw new Error("This video has no playable duration.");
      } finally {
        URL.revokeObjectURL(url);
      }
      const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      const hex = Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      const id = `upload.${hex}`;
      const asset = RuntimeAssetSchema.parse({
        id,
        path: `media/${id}.${mime === "video/mp4" ? "mp4" : "webm"}`,
        type: "video",
        alt: file.name,
        upload: { digest: hex, mime, size: file.size, rights: draft.rights, durationMs },
      });
      await storeUploadedMedia(asset, new Blob([file], { type: mime }));
      onUpload(asset);
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
      <label>
        Video permission / rights
        <input
          maxLength={500}
          value={draft.rights}
          onChange={(event) => setDraft({ ...draft, rights: event.target.value })}
        />
      </label>
      <DurationField
        label="Video duration in seconds (optional override)"
        min={0.01}
        max={86400}
        value={draft.duration}
        onChange={(duration) => setDraft({ ...draft, duration })}
        help="Leave blank for automatic duration. If this browser cannot decode the video, enter its duration to edit and back it up; playback still needs a compatible codec."
      />
      <label>
        Video file (MP4 / WebM, max 50 MB)
        <input
          type="file"
          accept="video/mp4,video/webm,.mp4,.webm"
          disabled={draft.busy}
          onChange={(event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            if (file)
              void upload(file).finally(() => {
                input.value = "";
              });
          }}
        />
      </label>
      {draft.busy && <p role="status">Verifying and storing video…</p>}
      {draft.error && <p role="alert">{draft.error}</p>}
      <p>
        Videos stay in this browser until included in a complete project backup. Playback depends on
        the browser's codecs.
      </p>
    </fieldset>
  );
}
