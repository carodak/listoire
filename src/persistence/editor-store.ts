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
const store = () => createStore("listoire-editor", "projects");

export async function readEditorRecord(): Promise<EditorRecord | null> {
  const raw = await get("house", store());
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
  let saved: EditorRecord | undefined;
  await update(
    "house",
    (raw: unknown) => {
      const previous = raw === undefined ? null : RecordSchema.parse(raw);
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
      saved = RecordSchema.parse({
        revision: expectedRevision + 1,
        draft: valid,
        published: published ?? previous?.published ?? null,
        history: checkpoint
          ? [...history.slice(-29), { at, label: checkpointLabel ?? label, project: valid }]
          : history,
      });
      return saved;
    },
    store(),
  );
  return saved!;
}
