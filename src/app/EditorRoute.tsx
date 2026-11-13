import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { CloseButton } from "../shared/CloseButton.tsx";
import { download } from "../features/editor/downloads.ts";
import { StoryEditor } from "../features/editor/StoryEditor.tsx";
import type { StoryProject } from "../contracts/editor-project.ts";
import type { StoryBundle } from "../contracts/story.ts";
import type { ReadingPreferences } from "../contracts/presentation.ts";
import { createPlayer } from "./create-player.ts";
import { memorySaveStore, SaveManager } from "../persistence/save-manager.ts";
import { StoryPlayer } from "../features/reader/StoryPlayer.tsx";
import { message } from "../contracts/error-message.ts";

export default function EditorRoute() {
  return (
    <StoryEditor
      renderPreview={(bundle, project, knot, onClose, settled) => (
        <FullExperiencePreview {...{ bundle, project, knot, onClose, settled }} />
      )}
    />
  );
}

interface FullExperiencePreviewProps {
  bundle: StoryBundle;
  project: StoryProject;
  knot: string;
  onClose: () => void;
  /** A live refresh: the page appears in its final state, where the author was reading. */
  settled: boolean;
}

function FullExperiencePreview({
  bundle,
  project,
  knot,
  onClose,
  settled,
}: FullExperiencePreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const [chosen, setPreferences] = useState(project.languages[bundle.locale]!.defaults);
  // The editor never animates text, whatever the story's text mode (the reader still does).
  const preferences = { ...chosen, reveal: "instant" as const };
  const container = useRef<HTMLElement>(null);
  const { player, error, setError, saves } = usePreviewPlayer(
    bundle,
    knot,
    preferences,
    settled,
    container,
  );
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
            // Kept across live refreshes (same scroll, open panels); a new Preview rebuilds it.
            key={player.bundle.locale}
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

function usePreviewPlayer(
  bundle: StoryBundle,
  knot: string,
  preferences: ReadingPreferences,
  settled: boolean,
  container: RefObject<HTMLElement | null>,
) {
  // The bundle it plays: during a refresh the previous player stays until the next is ready.
  const [player, setPlayer] = useState<
    (Awaited<ReturnType<typeof createPlayer>> & { bundle: StoryBundle }) | null
  >(null);
  const [error, setError] = useState("");
  const latest = useRef({ preferences, settled });
  useEffect(() => {
    latest.current = { preferences, settled };
  }, [preferences, settled]);
  const saves = useRef<SaveManager | null>(null);
  useEffect(() => {
    let cancelled = false;
    let director: NonNullable<typeof player>["director"] | undefined;
    const isolated = new SaveManager(memorySaveStore());
    saves.current = isolated;
    void createPlayer(bundle, isolated, latest.current.preferences, {
      startKnot: knot || undefined,
    })
      .then(async (created) => {
        director = created.director;
        if (cancelled) {
          director.dispose();
          return;
        }
        const { settled } = latest.current;
        const restoreScroll = settled ? keepScroll(container.current) : undefined;
        setPlayer({ ...created, bundle });
        await director.load(settled);
        restoreScroll?.();
      })
      .catch((error) => {
        if (!cancelled) setError(message(error));
      });
    return () => {
      cancelled = true;
      director?.dispose();
    };
  }, [bundle, knot, container]);
  return { player, error, setError, saves };
}

/** The preview and its text frame (each page mounts a new one) return to where they were. */
function keepScroll(root: HTMLElement | null) {
  const board = root?.querySelector(".reader-board");
  const content = root?.querySelector(".preview-content")?.scrollTop ?? 0;
  const top = board?.scrollTop ?? 0;
  // shortcut: retries for about a second while the new page lays out, then gives up.
  const restore = (frames: number) => {
    const next = root?.querySelector(".reader-board");
    const preview = root?.querySelector(".preview-content");
    if (preview) preview.scrollTop = content;
    if (next && next !== board) next.scrollTop = top;
    const done = next && next !== board && Math.abs(next.scrollTop - top) < 2;
    if (!done && frames > 0) requestAnimationFrame(() => restore(frames - 1));
  };
  return () => restore(60);
}
