import { useEffect, useRef, useState } from "react";
import { message } from "../../contracts/error-message.ts";
import type { RefObject } from "react";
import type { StoryProject } from "../../contracts/editor-project.ts";
import { readEditorRecord, writeEditorRecord } from "../../persistence/editor-store.ts";
import { compileInWorker } from "./compile-client.ts";
import { ProjectHistory } from "./project-history.ts";
import { loadAce } from "./ace.ts";
import { withMediaReferences } from "./media-script.ts";
import { refreshDefaultArtwork } from "../../contracts/artwork-refresh.ts";
import { addIllustrationLibrary } from "./illustration-pack.ts";
import { loadDefaultProject, readActiveProject } from "./default-project.ts";
import { synchronizeScenes } from "./scene-script.ts";

type Versions = NonNullable<Awaited<ReturnType<typeof readEditorRecord>>>["history"];

interface Session {
  latest: StoryProject | null;
  revision: number;
  serial: Promise<void>;
  change: number;
  lastEvent: string;
  dirty: boolean;
  mounted: boolean;
  ui: EditorUi;
  keptScenes: NonNullable<Parameters<typeof synchronizeScenes>[1]>;
}

interface EditorUi {
  setProject(project: StoryProject): void;
  setStatus(status: string): void;
  setIssues(issues: string[]): void;
  setVersions(versions: Versions): void;
  setIllustrationPack(project: StoryProject): void;
}

export function useEditorProject() {
  const [project, setProject] = useState<StoryProject | null>(null);
  const [status, setStatus] = useState("Loading story project…");
  const [issues, setIssues] = useState<string[]>([]);
  const [versions, setVersions] = useState<Versions>([]);
  const [illustrationPack, setIllustrationPack] = useState<StoryProject | null>(null);
  const [history] = useState(() => new ProjectHistory());
  const session = useRef(
    createSession({ setProject, setStatus, setIssues, setVersions, setIllustrationPack }),
  );

  useEffect(() => {
    const current = session.current;
    current.mounted = true;
    const scope = new AbortController();
    void loadSession(current, scope.signal).catch((error) => {
      if (!scope.signal.aborted)
        setStatus(`Load failed: ${message(error)}. Stored data has been kept.`);
    });
    return () => {
      current.mounted = false;
      scope.abort();
    };
  }, []);
  useLeaveGuard(session);

  function update(next: StoryProject, label: string) {
    const latest = session.current.latest;
    if (label === "Restored project backup") session.current.keptScenes.clear();
    next = withMediaReferences(
      synchronizeScenes(refreshDefaultArtwork(next, latest), session.current.keptScenes),
    );
    if (!latest || next === latest) return;
    history.record(latest, next, label);
    replaceProject(session.current, next, label);
  }
  const save = (label = "Save project") => saveSession(session.current, label);
  useEffect(() => {
    if (!project || !session.current.dirty) return;
    const timer = setTimeout(() => {
      void saveSession(session.current, "Autosave");
    }, 1200);
    return () => clearTimeout(timer);
  }, [project]);

  return {
    project,
    update,
    save,
    status,
    issues,
    setIssues,
    versions,
    undo: () => replaceProject(session.current, history.undo(), "Undid an editing change"),
    redo: () => replaceProject(session.current, history.redo(), "Redid an editing change"),
    illustrationPack,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
  };
}

function createSession(ui: EditorUi): Session {
  return {
    ui,
    keptScenes: new Map(),
    latest: null,
    revision: 0,
    serial: Promise.resolve(),
    change: 0,
    lastEvent: "Original story",
    dirty: false,
    mounted: true,
  };
}

function useLeaveGuard(session: RefObject<Session>) {
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => {
      if (!session.current.dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [session]);
}

async function loadSession(session: Session, signal: AbortSignal) {
  const record = await readActiveProject(signal);
  const built = await loadDefaultProject(record?.draft, signal);
  const raw = record?.draft ?? built!;
  const seed = withMediaReferences(
    synchronizeScenes(
      addIllustrationLibrary(refreshDefaultArtwork(raw, built), built),
      session.keptScenes,
    ),
  );
  await loadAce();
  if (signal.aborted) return;
  session.ui.setIllustrationPack(built!);
  const initialized = record ?? (await writeEditorRecord(seed, 0, "Original story"));
  if (signal.aborted) return;
  session.revision = initialized.revision;
  session.latest = seed;
  session.dirty =
    JSON.stringify(initialized.draft) !== JSON.stringify(seed) ||
    !initialized.published ||
    initialized.published.revision < initialized.revision;
  session.ui.setProject(seed);
  session.ui.setVersions(initialized.history);
  session.ui.setStatus(record ? "Saved project loaded" : "Original story loaded · autosave ready");
}

function replaceProject(session: Session, next: StoryProject | undefined, label: string) {
  if (!next) return;
  session.lastEvent = label;
  session.latest = next;
  session.change++;
  session.dirty = true;
  session.ui.setProject(next);
  session.ui.setStatus("Unsaved changes");
}

function saveSession(session: Session, label: string) {
  const source = session.latest;
  if (!source) return Promise.resolve(false);
  const generation = session.change;
  const eventLabel = session.lastEvent;
  const operation = session.serial
    .catch(() => {})
    .then(() => writeAndPublish(session, source, generation, label, eventLabel));
  session.serial = operation;
  return operation
    .then(() => true)
    .catch((error) => {
      session.ui.setStatus(`Save failed: ${message(error)}`);
      session.ui.setIssues([message(error)]);
      return false;
    });
}

async function writeAndPublish(
  session: Session,
  source: StoryProject,
  generation: number,
  label: string,
  eventLabel: string,
) {
  session.ui.setStatus("Saving draft…");
  const draft = await writeEditorRecord(source, session.revision, label, undefined, eventLabel);
  session.revision = draft.revision;
  if (!session.mounted) return;
  session.ui.setVersions(draft.history);
  if (generation === session.change) session.dirty = false;
  try {
    const bundles = await compileInWorker(source);
    if (generation !== session.change || !session.mounted) return;
    const defaults = Object.fromEntries(
      Object.entries(source.languages).map(([locale, language]) => [locale, language.defaults]),
    );
    const published = await writeEditorRecord(source, session.revision, "Autosave", {
      revision: session.revision + 1,
      bundles,
      defaults,
    });
    session.revision = published.revision;
    session.ui.setVersions(published.history);
    session.ui.setIssues([]);
    session.ui.setStatus("Saved · reader updated");
  } catch (error) {
    if (generation !== session.change) return;
    session.ui.setIssues([message(error)]);
    session.ui.setStatus("Draft saved · fix issues to update the reader");
  }
}
