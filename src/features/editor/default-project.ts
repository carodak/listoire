import { StoryProjectSchema } from "../../contracts/editor-project.ts";
import type { StoryProject } from "../../contracts/editor-project.ts";
import { readEditorRecord, writeEditorRecord } from "../../persistence/editor-store.ts";

export async function loadDefaultProject(draft: StoryProject | undefined, signal: AbortSignal) {
  try {
    const response = await fetch("/stories/house/project.json", { signal, redirect: "error" });
    if (!response.ok)
      throw new Error("The built story project is unavailable. Run npm run stories:build.");
    return StoryProjectSchema.parse(await response.json());
  } catch (error) {
    if (!draft) throw error;
    return null;
  }
}

export async function readActiveProject(signal: AbortSignal) {
  const record = await readEditorRecord();
  if (record?.draft.release !== "0.3.1") return record;
  const built = await loadDefaultProject(record.draft, signal);
  if (built?.release !== "oree-1.0.0" || signal.aborted) return record;
  try {
    const archived = await writeEditorRecord(
      record.draft,
      record.revision,
      "Before replacing the house story with Orée",
    );
    return await writeEditorRecord(
      built,
      archived.revision,
      "Installed Orée chapter and sketch library",
    );
  } catch {
    // A competing tab may have saved; never overwrite a newer revision.
    return await readEditorRecord();
  }
}
