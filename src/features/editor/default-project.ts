import { storyFileUrl } from "../../contracts/app-path.ts";
import { sameOriginFetch } from "../../contracts/same-origin-fetch.ts";
import { StoryProjectSchema } from "../../contracts/editor-project.ts";
import type { StoryProject } from "../../contracts/editor-project.ts";
import type { NarrativeEvent } from "../../contracts/narrative-events.ts";
import { readEditorRecord, writeEditorRecord } from "../../persistence/editor-store.ts";

export async function loadDefaultProject(draft: StoryProject | undefined, signal: AbortSignal) {
  try {
    const response = await sameOriginFetch(storyFileUrl("house", "project.json"), { signal });
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
  if (!record) return record;
  const stock = isStockProject(record.draft);
  const previous =
    record.draft.storyId === "house" &&
    (record.draft.release === "0.3.1" || (stock && record.draft.release !== "oree-1.3.0"));
  if (!previous && !(stock && needsReaderDirection(record.draft))) return record;
  const built = await loadDefaultProject(record.draft, signal);
  if (built?.release !== "oree-1.3.0" || signal.aborted) return record;
  const next = previous ? built : refreshReaderDirection(record.draft, built);
  if (!previous && JSON.stringify(next) === JSON.stringify(record.draft)) return record;
  try {
    const archived = await writeEditorRecord(
      record.draft,
      record.revision,
      previous
        ? "Before installing Orée 1.3 — complete previous draft"
        : "Before updating reader direction — complete previous draft",
    );
    if (signal.aborted) return archived;
    return await writeEditorRecord(
      next,
      archived.revision,
      previous
        ? "Installed Orée 1.3 — practice duel with Ysée"
        : "Updated gallery portraits and board cues; story/checkpoints unchanged",
    );
  } catch {
    // A competing tab may have saved; never overwrite a newer revision.
    return await readEditorRecord();
  }
}

function needsReaderDirection(project: StoryProject) {
  return Object.values(project.languages).some(
    ({ configuration }) =>
      configuration.game?.encounters.some(
        (encounter) =>
          ["ysee-training", "broken-guardian"].includes(encounter.id) && !encounter.portrait,
      ) ||
      (Boolean(configuration.scenes?.atelier) &&
        !configuration.scenes?.atelier?.events?.some((event) => event.id === "atelier.board-beat")),
  );
}

function refreshReaderDirection(draft: StoryProject, source: StoryProject) {
  const next = structuredClone(draft);
  for (const [locale, language] of Object.entries(next.languages)) {
    const original = source.languages[locale]?.configuration;
    if (!original) continue;
    refreshEncounterPortraits(language.configuration, original);
    refreshSceneCues(language.configuration, original);
  }
  return next;
}

const defaultCheckpoints: Record<string, string> = {
  "oree-1.0.0": "oree",
  "oree-1.1.0": "oree",
  "oree-1.2.0": "oree-v1-2",
  "oree-1.3.0": "oree-v1-3",
};
function isStockProject(project: StoryProject) {
  const checkpoint = defaultCheckpoints[project.release];
  return (
    project.storyId === "house" &&
    Boolean(checkpoint) &&
    Object.values(project.languages).every(
      ({ configuration }) =>
        configuration.checkpointId === checkpoint &&
        [
          "L’École des choses impossibles",
          "L'École des choses impossibles",
          "The School of Impossible Things",
        ].includes(configuration.title),
    )
  );
}

type Configuration = StoryProject["languages"][string]["configuration"];
function refreshEncounterPortraits(configuration: Configuration, original: Configuration) {
  for (const encounter of configuration.game?.encounters ?? []) {
    const updated = original.game?.encounters.find((entry) => entry.id === encounter.id);
    if (encounter.portrait || !updated?.portrait) continue;
    encounter.portrait = updated.portrait;
    if (["The paper dragon", "Le dragon de papier"].includes(encounter.name))
      encounter.name = updated.name;
    const asset = original.assets?.find((asset) => asset.id === updated.portrait);
    if (asset && !configuration.assets?.some((entry) => entry.id === asset.id))
      (configuration.assets ??= []).push(asset);
  }
}

function refreshSceneCues(configuration: Configuration, original: Configuration) {
  for (const [id, scene] of Object.entries(configuration.scenes ?? {})) {
    for (const event of original.scenes?.[id]?.events ?? []) {
      if (!isReaderCue(event, scene)) continue;
      const events = (scene.events ??= []);
      const index = events.findIndex((entry) => entry.id === event.id);
      if (index < 0) events.push(event);
      else events[index] = event;
    }
  }
}

function isReaderCue(event: NarrativeEvent, scene: NonNullable<Configuration["scenes"]>[string]) {
  const trigger = event.trigger;
  return (
    (event.id.endsWith(".board-beat") ||
      event.id.endsWith(".spell-flash") ||
      event.id === "serre.camera-impact") &&
    (trigger.kind !== "segment" ||
      scene.blocks?.some((block) => block.kind === "text" && block.segmentId === trigger.segmentId))
  );
}
