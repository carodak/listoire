import { useEffect, useRef, useState } from "react";
import { CloseButton } from "../shared/CloseButton.tsx";
import { download } from "../features/editor/downloads.ts";
import { StoryEditor } from "../features/editor/StoryEditor.tsx";
import type { StoryProject } from "../contracts/editor-project.ts";
import type { StoryBundle } from "../contracts/story.ts";
import type { ReadingPreferences } from "../contracts/presentation.ts";
import { createPlayer } from "./create-player.ts";
import { SaveManager } from "../persistence/save-manager.ts";
import { StoryPlayer } from "../features/reader/StoryPlayer.tsx";
import { message } from "../contracts/error-message.ts";

export default function EditorRoute() {
  return (
    <StoryEditor
      renderPreview={(bundle, project, knot, onClose) => (
        <FullExperiencePreview {...{ bundle, project, knot, onClose }} />
      )}
    />
  );
}

interface FullExperiencePreviewProps {
  bundle: StoryBundle;
  project: StoryProject;
  knot: string;
  onClose: () => void;
}

function FullExperiencePreview({ bundle, project, knot, onClose }: FullExperiencePreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const [preferences, setPreferences] = useState(project.languages[bundle.locale]!.defaults);
  const { player, error, setError, saves } = usePreviewPlayer(bundle, knot, preferences);
  const container = useRef<HTMLElement>(null);
  const toggleFullscreen = () => {
    if (document.fullscreenElement === container.current) {
      void document.exitFullscreen().catch((error) => setError(message(error)));
    } else if (!container.current?.requestFullscreen) setExpanded(!expanded);
    else void container.current.requestFullscreen().catch(() => setExpanded(!expanded));
  };
  return (
    <section
      className="experience-preview"
      aria-label="Story preview"
      data-window={expanded ? "maximized" : "normal"}
      ref={container}
    >
      <PreviewHeader onClose={onClose} onFullscreen={toggleFullscreen} />
      {error && <p role="alert">{error}</p>}
      <div className="preview-content">
        {player && (
          <StoryPlayer
            key={`${bundle.locale}:${knot}`}
            bundle={bundle}
            {...player}
            preferences={preferences}
            onPreferencesChange={setPreferences}
            preview
            backup={async () =>
              download("preview-checkpoint.json", await saves.current!.backup(bundle))
            }
          />
        )}
      </div>
    </section>
  );
}

function PreviewHeader({
  onClose,
  onFullscreen,
}: {
  onClose: () => void;
  onFullscreen: () => void;
}) {
  return (
    <header className="preview-header">
      <strong>Preview</strong>
      <button
        aria-label="Fullscreen preview"
        title="Open the preview in fullscreen"
        onClick={onFullscreen}
      >
        ⛶
      </button>
      <CloseButton
        label="Close preview"
        title="Close preview; use Preview above to reopen it"
        onClick={onClose}
      />
    </header>
  );
}

function usePreviewPlayer(bundle: StoryBundle, knot: string, preferences: ReadingPreferences) {
  const [player, setPlayer] = useState<Awaited<ReturnType<typeof createPlayer>> | null>(null);
  const [error, setError] = useState("");
  const latestPreferences = useRef(preferences);
  useEffect(() => {
    latestPreferences.current = preferences;
  }, [preferences]);
  const saves = useRef<SaveManager | null>(null);
  useEffect(() => {
    let cancelled = false;
    let director: NonNullable<typeof player>["director"] | undefined;
    const memory = new Map<string, unknown>();
    const isolated = new SaveManager({
      read: async (key) => memory.get(key),
      update: async (key, updater) => {
        memory.set(key, updater(memory.get(key)));
      },
    });
    saves.current = isolated;
    void createPlayer(bundle, isolated, latestPreferences.current, { startKnot: knot || undefined })
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
  }, [bundle, knot]);
  return { player, error, setError, saves };
}
