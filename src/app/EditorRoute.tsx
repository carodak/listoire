import { useEffect, useRef, useState } from "react";
import { StoryEditor } from "../features/editor/StoryEditor.tsx";
import { download } from "../features/editor/downloads.ts";
import type { StoryProject } from "../contracts/editor-project.ts";
import type { StoryBundle } from "../contracts/story.ts";
import { createPlayer } from "./create-player.ts";
import { SaveManager } from "../persistence/save-manager.ts";
import { StoryPlayer } from "../features/reader/StoryPlayer.tsx";
import type { PresentationSession } from "../features/presentation/presentation-session.ts";
import type { StoryDirector } from "../features/story-runtime/director.ts";
import { compileInWorker } from "../features/editor/compile-client.ts";
import { message } from "../features/editor/use-editor-project.ts";
import { PreviewStateSchema } from "../contracts/editor-project.ts";
import { JsonProperties } from "../features/editor/JsonProperties.tsx";

export default function EditorRoute() {
  return (
    <StoryEditor
      renderPreview={(bundle, project, knot, onClose) => (
        <FullExperiencePreview bundle={bundle} project={project} knot={knot} onClose={onClose} />
      )}
    />
  );
}

function FullExperiencePreview({
  bundle: initialBundle,
  project,
  knot,
  onClose,
}: {
  bundle: StoryBundle;
  project: StoryProject;
  knot: string;
  onClose: () => void;
}) {
  const [bundle, setBundle] = useState(initialBundle);
  const [start, setStart] = useState(knot);
  const [revision, setRevision] = useState(0);
  const [preferences, setPreferences] = useState(project.languages[bundle.locale]!.defaults);
  const [player, setPlayer] = useState<{
    director: StoryDirector;
    presentation: PresentationSession;
  } | null>(null);
  const [error, setError] = useState("");
  const [inspect, setInspect] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testState, setTestState] = useState(PreviewStateSchema.parse({ variables: {} }));
  const container = useRef<HTMLElement>(null);
  const latestPreferences = useRef(preferences);
  useEffect(() => {
    latestPreferences.current = preferences;
  }, [preferences]);
  const saves = useRef<SaveManager | null>(null);
  useEffect(() => {
    let cancelled = false;
    let director: StoryDirector | undefined;
    const memory = new Map<string, unknown>();
    const isolated = new SaveManager({
      read: async (key) => memory.get(key),
      update: async (key, updater) => {
        memory.set(key, updater(memory.get(key)));
      },
    });
    saves.current = isolated;
    void createPlayer(bundle, isolated, latestPreferences.current, {
      startKnot: start || undefined,
      state: testState,
    })
      .then(async (created) => {
        director = created.director;
        if (cancelled) {
          director.dispose();
          return;
        }
        setPlayer(created);
        await director.load();
      })
      .catch((error) => {
        if (!cancelled) setError(message(error));
      });
    return () => {
      cancelled = true;
      director?.dispose();
    };
  }, [bundle, start, revision, testState]);
  return (
    <section className="experience-preview" aria-label="Full Experience Preview" ref={container}>
      <header className="preview-header">
        <strong>Full Experience Preview</strong>
        <button
          onClick={() => {
            setStart("");
            setRevision((v) => v + 1);
          }}
        >
          Play Story
        </button>
        <button onClick={() => setRevision((v) => v + 1)}>Restart / Reset state</button>
        <select
          aria-label="Preview language"
          value={bundle.locale}
          onChange={(event) => {
            const locale = event.target.value;
            void compileInWorker(project, locale)
              .then((bundles) => {
                setBundle(bundles[locale]!);
                setPreferences(project.languages[locale]!.defaults);
              })
              .catch((error) => setError(message(error)));
          }}
        >
          {Object.keys(project.languages).map((locale) => (
            <option key={locale}>{locale}</option>
          ))}
        </select>
        <button onClick={() => player?.presentation.pause()}>Pause</button>
        <button onClick={() => player?.presentation.resume()}>Resume</button>
        <button
          onClick={() => {
            void container.current?.requestFullscreen().catch((error) => setError(message(error)));
          }}
        >
          Fullscreen
        </button>
        <button onClick={() => setInspect(!inspect)}>Inspect state</button>
        <button onClick={() => setTesting(true)}>Set test state</button>
        <button
          className="primary"
          title="Close the preview. Reopen it with the Preview button."
          aria-label="Close preview"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <p role="alert" hidden={!error}>
        {error}
      </p>
      {testing && (
        <JsonProperties
          title="Preview test state"
          value={testState}
          description="Set declared Ink variables and, optionally, a validated character checkpoint. Applying restarts this isolated preview."
          onApply={(value) => {
            setTestState(PreviewStateSchema.parse(value));
            setRevision((v) => v + 1);
          }}
          onClose={() => setTesting(false)}
        />
      )}
      <pre className="preview-state" hidden={!inspect}>
        {JSON.stringify(player?.director.getSnapshot(), null, 2)}
      </pre>
      {player && (
        <StoryPlayer
          key={`${bundle.locale}:${revision}:${start}`}
          bundle={bundle}
          {...player}
          preferences={preferences}
          onPreferencesChange={setPreferences}
          backup={async () =>
            download("preview-checkpoint.json", await saves.current!.backup(bundle))
          }
        />
      )}
    </section>
  );
}
