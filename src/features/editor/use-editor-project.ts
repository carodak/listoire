import { useEffect, useRef, useState } from "react";
import { StoryProjectSchema } from "../../contracts/editor-project.ts";
import type { StoryProject } from "../../contracts/editor-project.ts";
import { readEditorRecord, writeEditorRecord } from "../../persistence/editor-store.ts";
import { compileInWorker } from "./compile-client.ts";
import { ProjectHistory } from "./project-history.ts";
import { loadAce } from "./ace.ts";
import { verifyMediaAssets } from "./asset-validation.ts";
import { withMediaReferences } from "./media-references.ts";

export function useEditorProject() {
  const [project, setProject] = useState<StoryProject | null>(null);
  const [status, setStatus] = useState("Loading story project…");
  const [issues, setIssues] = useState<string[]>([]);
  const [versions, setVersions] = useState<
    NonNullable<Awaited<ReturnType<typeof readEditorRecord>>>["history"]
  >([]);
  const latest = useRef<StoryProject | null>(null);
  const history = useRef<ProjectHistory | null>(null);
  const revision = useRef(0);
  const serial = useRef(Promise.resolve());
  const change = useRef(0);
  const lastEvent = useRef("Original story");
  const dirty = useRef(false);
  const mounted = useRef(true);
  const [availability, setAvailability] = useState({ canUndo: false, canRedo: false });

  useEffect(() => {
    mounted.current = true;
    const scope = new AbortController();
    async function load() {
      const record = await readEditorRecord();
      const raw =
        record?.draft ??
        (await fetch("/stories/house/project.json", {
          signal: scope.signal,
          redirect: "error",
        }).then(async (response) => {
          if (!response.ok)
            throw new Error("The built story project is unavailable. Run npm run stories:build.");
          return response.json() as Promise<unknown>;
        }));
      const seed = withMediaReferences(StoryProjectSchema.parse(raw));
      const ace = await loadAce();
      if (scope.signal.aborted) return;
      const initialized = record ?? (await writeEditorRecord(seed, 0, "Original story"));
      if (scope.signal.aborted) return;
      revision.current = initialized.revision;
      history.current = new ProjectHistory(new ace.UndoManager(), (restored) => {
        latest.current = restored;
        dirty.current = true;
        change.current++;
        setProject(restored);
        setStatus("Unsaved changes");
      });
      latest.current = seed;
      dirty.current =
        JSON.stringify(initialized.draft) !== JSON.stringify(seed) ||
        !initialized.published ||
        initialized.published.revision < initialized.revision;
      setProject(seed);
      setVersions(initialized.history);
      setStatus(record ? "Saved project loaded" : "Original story loaded · autosave ready");
    }
    void load().catch((error) => {
      if (!scope.signal.aborted)
        setStatus(`Load failed: ${message(error)}. Stored data has been kept.`);
    });
    const unload = (event: BeforeUnloadEvent) => {
      if (dirty.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", unload);
    return () => {
      mounted.current = false;
      scope.abort();
      window.removeEventListener("beforeunload", unload);
    };
  }, []);

  function update(next: StoryProject, label: string) {
    next = withMediaReferences(next);
    if (!latest.current || next === latest.current) return;
    history.current?.record(latest.current, next, label);
    lastEvent.current = label;
    setAvailability({
      canUndo: history.current?.canUndo ?? false,
      canRedo: history.current?.canRedo ?? false,
    });
    latest.current = next;
    change.current++;
    dirty.current = true;
    setProject(next);
    setStatus("Unsaved changes");
  }

  function save(label = "Save project") {
    const source = latest.current;
    const generation = change.current;
    const eventLabel = lastEvent.current;
    if (!source) return Promise.resolve();
    const operation = serial.current
      .catch(() => {})
      .then(async () => {
        setStatus("Saving draft…");
        const draft = await writeEditorRecord(
          source,
          revision.current,
          label,
          undefined,
          eventLabel,
        );
        revision.current = draft.revision;
        if (!mounted.current) return;
        setVersions(draft.history);
        if (generation === change.current) dirty.current = false;
        try {
          const bundles = await compileInWorker(source);
          await verifyMediaAssets(bundles);
          if (generation !== change.current || !mounted.current) return;
          const published = await writeEditorRecord(source, revision.current, "Autosave", {
            revision: revision.current + 1,
            bundles,
            defaults: Object.fromEntries(
              Object.entries(source.languages).map(([locale, language]) => [
                locale,
                language.defaults,
              ]),
            ),
          });
          revision.current = published.revision;
          setVersions(published.history);
          setIssues([]);
          setStatus("Saved · reader updated");
        } catch (error) {
          if (generation !== change.current) return;
          setIssues([message(error)]);
          setStatus("Draft saved · fix issues to update the reader");
        }
      });
    serial.current = operation;
    return operation.catch((error) => {
      setStatus(`Save failed: ${message(error)}`);
      setIssues([message(error)]);
    });
  }
  useEffect(() => {
    if (!project || !dirty.current) return;
    const timer = setTimeout(() => {
      void save("Autosave");
    }, 1200);
    return () => clearTimeout(timer);
  }, [project]);

  function undo() {
    lastEvent.current = "Undid an editing change";
    history.current?.undo();
    setAvailability({
      canUndo: history.current?.canUndo ?? false,
      canRedo: history.current?.canRedo ?? false,
    });
  }
  function redo() {
    lastEvent.current = "Redid an editing change";
    history.current?.redo();
    setAvailability({
      canUndo: history.current?.canUndo ?? false,
      canRedo: history.current?.canRedo ?? false,
    });
  }
  return {
    project,
    update,
    save,
    status,
    issues,
    setIssues,
    versions,
    undo,
    redo,
    ...availability,
  };
}

export function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
