import { createStore, get, getMany, promisifyRequest, setMany } from "idb-keyval";
import { z } from "zod";
import { PublishedProjectSchema, StoryProjectSchema } from "../contracts/editor-project.ts";
import type { StoryProject } from "../contracts/editor-project.ts";

/**
 * The editor record lives under `house/record` (draft, publication, history index); each
 * history version is its own `house/version/<id>` key, so a save clones one project, not 30.
 * A record from before that split (`house`, versions inline) is moved once on read; while it
 * exists it stays the one read and written.
 */
const legacyKey = "house";
const recordKey = "house/record";
const versionKey = (id: number) => `house/version/${id}`;
const maxVersions = 30;
/** Total JSON characters kept across versions; the newest version is always kept. */
const historyBudget = 64_000_000;

const VersionSchema = z
  .object({
    id: z.number().int().positive(),
    at: z.string(),
    label: z.string(),
    size: z.number().int().nonnegative(),
  })
  .strict();
const RecordSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    draft: StoryProjectSchema,
    published: PublishedProjectSchema.nullable(),
    history: z.array(VersionSchema).max(maxVersions),
  })
  .strict();
const LegacyRecordSchema = RecordSchema.extend({
  history: z
    .array(z.object({ at: z.string(), label: z.string(), project: StoryProjectSchema }).strict())
    .max(maxVersions),
});
type EditorRecord = z.infer<typeof RecordSchema>;
type Version = z.infer<typeof VersionSchema>;
type LegacyVersion = z.infer<typeof LegacyRecordSchema>["history"][number];
/**
 * What a write needs from the stored record: its revision and history as they are. Everything
 * in it was validated when it was written and is validated again on read.
 */
const StoredSchema = z.object({
  revision: z.number().int().nonnegative(),
  published: z.unknown(),
  history: z.array(z.object({ at: z.string() }).loose()).max(maxVersions),
});
const store = createStore("listoire-editor", "projects");

export async function readEditorRecord(): Promise<EditorRecord | null> {
  const legacy = await get(legacyKey, store);
  if (legacy !== undefined)
    try {
      await migrate(legacy);
    } catch (error) {
      console.warn("Editor history kept in its previous format:", error);
      return fromLegacy(LegacyRecordSchema.parse(legacy));
    }
  const raw = await get(recordKey, store);
  return raw === undefined ? null : RecordSchema.parse(raw);
}

/** A history version's project, validated as it is read. */
export async function readEditorVersion(id: number): Promise<StoryProject> {
  const legacy = await get(legacyKey, store);
  const project =
    legacy === undefined
      ? await get(versionKey(id), store)
      : LegacyRecordSchema.parse(legacy).history[id - 1]?.project;
  return StoryProjectSchema.parse(project);
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
  return transaction([legacyKey, recordKey], ([legacy, current], objects) => {
    const stored = storedRecord(legacy ?? current, expectedRevision);
    const head: Head = {
      revision: expectedRevision + 1,
      draft: valid,
      published: (publication ?? stored?.published ?? null) as EditorRecord["published"],
    };
    const entry = isCheckpoint(stored, label)
      ? { at: new Date().toISOString(), label: checkpointLabel ?? label }
      : null;
    return legacy === undefined
      ? writeKeyed(objects, head, (stored?.history ?? []) as Version[], entry)
      : writeLegacy(objects, head, stored!.history as LegacyVersion[], entry);
  });
}

type Head = Omit<EditorRecord, "history">;
type Entry = { at: string; label: string } | null;

function storedRecord(raw: unknown, expectedRevision: number) {
  const stored = raw === undefined ? null : StoredSchema.parse(raw);
  if ((stored?.revision ?? 0) !== expectedRevision)
    throw new Error(
      "Another editor tab saved changes. Export your work before loading its version.",
    );
  return stored;
}

/** Named saves always add a version; autosaves at most every 30 s. */
function isCheckpoint(stored: z.infer<typeof StoredSchema> | null, label: string) {
  return (
    !stored ||
    label !== "Autosave" ||
    Date.now() - Date.parse(stored.history.at(-1)?.at ?? "") > 30_000
  );
}

function writeKeyed(objects: IDBObjectStore, head: Head, previous: Version[], entry: Entry) {
  let history = previous;
  if (entry) {
    const id = (previous.at(-1)?.id ?? 0) + 1;
    objects.put(head.draft, versionKey(id));
    history = pruned([...previous, { id, ...entry, size: JSON.stringify(head.draft).length }]);
    for (const { id } of previous)
      if (!history.some((version) => version.id === id)) objects.delete(versionKey(id));
  }
  const record = { ...head, history };
  objects.put(record, recordKey);
  return record;
}

/** The old single-key format, while a failed move keeps it in use. */
function writeLegacy(objects: IDBObjectStore, head: Head, previous: LegacyVersion[], entry: Entry) {
  const history = entry
    ? [...previous.slice(1 - maxVersions), { ...entry, project: head.draft }]
    : previous;
  objects.put({ ...head, history }, legacyKey);
  return fromLegacy({ ...head, history });
}

/** The last 30 versions, dropping the oldest while over the budget; the newest always stays. */
function pruned(history: Version[]) {
  const kept = history.slice(-maxVersions);
  let total = kept.reduce((sum, version) => sum + version.size, 0);
  while (kept.length > 1 && total > historyBudget) total -= kept.shift()!.size;
  return kept;
}

/**
 * Writes the new keys in one transaction, reads them back and compares them with the old
 * record, and deletes the old record only if no other tab changed it meanwhile.
 */
async function migrate(raw: unknown) {
  const old = LegacyRecordSchema.parse(raw);
  const versions = old.history.map(({ project }) => JSON.stringify(project));
  const record: EditorRecord = {
    revision: old.revision,
    draft: old.draft,
    published: old.published,
    history: old.history.map(({ at, label }, index) => ({
      id: index + 1,
      at,
      label,
      size: versions[index]!.length,
    })),
  };
  await setMany(
    [
      ...old.history.map(({ project }, index): [string, unknown] => [
        versionKey(index + 1),
        project,
      ]),
      [recordKey, record],
    ],
    store,
  );
  const [storedRecord, ...stored] = await getMany(
    [recordKey, ...record.history.map(({ id }) => versionKey(id))],
    store,
  );
  if (
    JSON.stringify(RecordSchema.parse(storedRecord)) !== JSON.stringify(record) ||
    stored.some(
      (project, index) => JSON.stringify(StoryProjectSchema.parse(project)) !== versions[index],
    )
  )
    throw new Error("The moved history does not read back as written.");
  await transaction([legacyKey], ([current], objects) => {
    if (StoredSchema.parse(current).revision !== old.revision)
      throw new Error("Another editor tab saved during the move.");
    objects.delete(legacyKey);
  });
}

function fromLegacy(record: z.infer<typeof LegacyRecordSchema>): EditorRecord {
  return {
    ...record,
    history: record.history.map(({ at, label }, index) => ({ id: index + 1, at, label, size: 0 })),
  };
}

/** Reads `keys`, then runs `change` inside the same read-write transaction; a throw aborts it. */
function transaction<T>(
  keys: string[],
  change: (values: unknown[], objects: IDBObjectStore) => T,
): Promise<T> {
  return store("readwrite", (objects) => {
    const requests = keys.map((key) => objects.get(key));
    const done = promisifyRequest(objects.transaction);
    let result: T;
    let failure: unknown;
    requests.at(-1)!.onsuccess = () => {
      try {
        result = change(
          requests.map((request) => request.result),
          objects,
        );
      } catch (error) {
        failure = error;
        objects.transaction.abort();
      }
    };
    return done.then(
      () => result,
      (error) => Promise.reject(failure ?? error),
    );
  });
}
