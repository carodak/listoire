import { useEffect, useRef, useState } from "react";
import { download } from "../features/editor/downloads.ts";
import { StoryEditor } from "../features/editor/StoryEditor.tsx";

import type { StoryProject } from "../contracts/editor-project.ts";
import type { StoryBundle } from "../contracts/story.ts";
import { createPlayer } from "./create-player.ts";
import { SaveManager } from "../persistence/save-manager.ts";
import { StoryPlayer } from "../features/reader/StoryPlayer.tsx";
import type { PresentationSession } from "../features/presentation/presentation-session.ts";
import type { StoryDirector } from "../features/story-runtime/director.ts";

import { message } from "../features/editor/use-editor-project.ts";

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
  const bundle = initialBundle;
  const start = knot;
  const [windowState, setWindowState] = useState("normal");
  const [preferences, setPreferences] = useState(project.languages[bundle.locale]!.defaults);
  const [player, setPlayer] = useState<{
    director: StoryDirector;
    presentation: PresentationSession;
  } | null>(null);
  const [error, setError] = useState("");

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
  }, [bundle, start]);
  return (
    <section
      className="experience-preview"
      aria-label="Story preview"
      data-window={windowState}
      ref={container}
    >
      <header className="preview-header">
        <strong>Preview</strong>
        <button
          aria-label={windowState === "minimized" ? "Restore preview" : "Minimize preview"}
          title="Minimize or restore the preview"
          onClick={() => {
            const minimized = windowState !== "minimized";
            setWindowState(minimized ? "minimized" : "normal");
            if (minimized) player?.presentation.pause();
            else player?.presentation.resume();
          }}
        >
          −
        </button>
        <button
          aria-label={windowState === "maximized" ? "Restore preview size" : "Maximize preview"}
          title="Expand the preview across the workspace"
          onClick={() => setWindowState(windowState === "maximized" ? "normal" : "maximized")}
        >
          □
        </button>
        <button
          aria-label="Fullscreen preview"
          title="Open the preview in fullscreen"
          onClick={() => {
            if (!container.current?.requestFullscreen) {
              setWindowState("maximized");
              return;
            }
            void container.current?.requestFullscreen().catch((error) => setError(message(error)));
          }}
        >
          ⛶
        </button>
        <button
          title="Close preview; use Preview above to reopen it"
          aria-label="Close preview"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      {error && <p role="alert">{error}</p>}
      <div className="preview-content" hidden={windowState === "minimized"}>
        {player && (
          <StoryPlayer
            key={`${bundle.locale}:${start}`}
            bundle={bundle}
            {...player}
            preferences={preferences}
            onPreferencesChange={setPreferences}
            focusPassage={false}
            backup={async () =>
              download("preview-checkpoint.json", await saves.current!.backup(bundle))
            }
          />
        )}
      </div>
    </section>
  );
}
