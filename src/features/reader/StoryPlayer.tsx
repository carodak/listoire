import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import type { FailureCode, Frame, StoryBundle } from "../../contracts/story.ts";
import type { StoryDirector } from "../story-runtime/director.ts";
import { PassageText } from "./PassageText.tsx";
import { CheckpointControls } from "./CheckpointControls.tsx";
import { ReadingControls } from "./ReadingControls.tsx";
import { PhotographExamination } from "./PhotographViewer.tsx";
import type { PresentationSession } from "../presentation/presentation-session.ts";
import { SceneIllustration } from "../presentation/SceneIllustration.tsx";
import type { ReadingPreferences } from "../../contracts/presentation.ts";
import { CharacterPanel } from "../character/CharacterPanel.tsx";
import "./reader.css";

interface Props {
  bundle: StoryBundle;
  director: StoryDirector;
  presentation: PresentationSession;
  backup: () => Promise<void>;
  preferences: ReadingPreferences;
  onPreferencesChange: (preferences: ReadingPreferences) => void;
}

export function StoryPlayer(props: Props) {
  const { t } = useTranslation();
  useEffect(() => {
    props.presentation.configure(props.preferences);
  }, [props.presentation, props.preferences]);
  useEffect(() => {
    let resumeOnFocus = false;
    const visibility = () => {
      if (document.hidden) {
        resumeOnFocus = !props.presentation.getSnapshot().paused;
        props.presentation.pause();
      } else if (resumeOnFocus) {
        resumeOnFocus = false;
        props.presentation.resume();
      }
    };
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const reduce = () => props.presentation.skipCinematic();
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", reduce);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      motion.removeEventListener("change", reduce);
    };
  }, [props.presentation]);
  const state = useSyncExternalStore(props.director.subscribe, props.director.getSnapshot);
  const [characterOpen, setCharacterOpen] = useState(false);
  const [localFailure, setLocalFailure] = useState<FailureCode | null>(null);
  const failure = state.failure ?? localFailure;
  const frame = state.frame;
  if (!frame)
    return (
      <main id="story" className="reader">
        {state.busy && <p className="loading">{t("loading")}</p>}
        <CheckpointControls
          director={props.director}
          busy={state.busy}
          hasFrame={false}
          failure={failure}
          onFailure={setLocalFailure}
          backup={props.backup}
        />
      </main>
    );
  return (
    <ReaderPassage
      key={state.occurrenceId!}
      player={props}
      state={{ ...state, frame }}
      characterOpen={characterOpen}
      onCharacterToggle={() => setCharacterOpen(!characterOpen)}
      failure={failure}
      onFailure={setLocalFailure}
    />
  );
}

function ReaderPassage({
  player,
  state,
  failure,
  onFailure,
  characterOpen,
  onCharacterToggle,
}: {
  player: Props;
  state: ReturnType<StoryDirector["getSnapshot"]> & { frame: Frame };
  characterOpen: boolean;
  onCharacterToggle: () => void;
  failure: FailureCode | null;
  onFailure: (code: FailureCode | null) => void;
}) {
  const { bundle, director, presentation, backup, preferences, onPreferencesChange } = player;
  const { t } = useTranslation();
  const scene = bundle.scenes?.[state.frame.passageId] ?? {
    title: bundle.title,
    progress: 0,
    photograph: false,
    notice: undefined,
  };
  const heading = useRef<HTMLHeadingElement>(null);
  const interactionDisabled = state.busy || Boolean(failure);
  const media = useSyncExternalStore(presentation.subscribe, presentation.getSnapshot);
  const instant = preferences.reveal === "instant" || state.restored;
  const choicesDisabled = interactionDisabled || media.blocking;
  const className = `reader font-${preferences.fontFamily} text-${preferences.fontSize} lines-${preferences.lineHeight}`;
  const choose = (id: string) => {
    void director.choose(id, state.occurrenceId!);
  };
  useEffect(() => {
    heading.current?.focus();
  }, [state.occurrenceId]);

  return (
    <main id="story" className={className} lang={bundle.locale} aria-busy={state.busy}>
      <div className="reader-toolbar">
        <ReadingControls
        preferences={preferences}
        onChange={onPreferencesChange}
        presentation={presentation}
      />
        <CharacterPanel
        bundle={bundle}
        frame={state.frame}
        profile={state.character}
        open={characterOpen}
        onToggle={onCharacterToggle}
      />
      </div>
      <p className="eyebrow">{t("chapterOne", { lng: bundle.locale })}</p>
      <h1 ref={heading} tabIndex={-1}>
        {scene.title}
      </h1>
      <SceneIllustration
        bundle={bundle}
        passageId={state.frame.passageId}
        presentation={presentation}
      />
      <PhotographExamination
        bundle={bundle}
        frame={state.frame}
        enabled={Boolean(scene.photograph)}
        disabled={interactionDisabled}
        onDiscover={choose}
      />
      <PassageText
        frame={state.frame}
        locale={bundle.locale}
        instant={instant}
        media={media}
        onSegmentRevealed={presentation.segmentRevealed}
        disabled={choicesDisabled}
        notice={scene.notice}
        onChoose={choose}
      />
      <progress
        className="story-progress"
        value={scene.progress}
        max={1}
        aria-label={t("storyProgress")}
      />
      <CheckpointControls
        director={director}
        busy={state.busy}
        hasFrame={true}
        failure={failure}
        onFailure={onFailure}
        backup={backup}
      />
    </main>
  );
}
