import { createStore, get, update } from "idb-keyval";
import { z } from "zod";
import { PublishedProjectSchema, StoryProjectSchema } from "../contracts/editor-project.ts";
import type { StoryProject } from "../contracts/editor-project.ts";

const VersionSchema = z
  .object({
    at: z.string(),
    label: z.string(),
    project: StoryProjectSchema,
  })
  .strict();
const RecordSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    draft: StoryProjectSchema,
    published: PublishedProjectSchema.nullable(),
    history: z.array(VersionSchema).max(30),
  })
  .strict();
type EditorRecord = z.infer<typeof RecordSchema>;
/**
 * What a write needs from the stored record: its revision and history as they are. Everything
 * in it was validated when it was written and is validated again on read; re-parsing up to 30
 * full projects on every autosave made saving cost grow with the history.
 */
const StoredSchema = z.object({
  revision: z.number().int().nonnegative(),
  published: z.unknown(),
  history: z.array(z.object({ at: z.string() }).loose()).max(30),
});
const store = createStore("listoire-editor", "projects");

export async function readEditorRecord(): Promise<EditorRecord | null> {
  const raw = await get("house", store);
  return raw === undefined ? null : RecordSchema.parse(raw);
}

export async function writeEditorRecord(
  project: StoryProject,
  expectedRevision: number,
  label: string,
  published?: z.infer<typeof PublishedProjectSchema>,
  checkpointLabel?: string,
): Promise<EditorRecord> {
  const valid = StoryProjectSchema.parse(project);
  const publication = published && PublishedProjectSchema.parse(published);
  let saved: EditorRecord | undefined;
  await update(
    "house",
    function commitDraft(raw: unknown) {
      const previous =
        raw === undefined ? null : (StoredSchema.parse(raw) as unknown as EditorRecord);
      if ((previous?.revision ?? 0) !== expectedRevision)
        throw new Error(
          "Another editor tab saved changes. Export your work before loading its version.",
        );
      const at = new Date().toISOString();
      const checkpoint =
        !previous ||
        label !== "Autosave" ||
        Date.now() - Date.parse(previous.history.at(-1)?.at ?? "") > 30_000;
      const history = previous?.history ?? [];
      saved = {
        revision: expectedRevision + 1,
        draft: valid,
        published: publication ?? previous?.published ?? null,
        history: checkpoint
          ? [...history.slice(-29), { at, label: checkpointLabel ?? label, project: valid }]
          : history,
      };
      return saved;
    },
    store,
  );
  return saved!;
}
