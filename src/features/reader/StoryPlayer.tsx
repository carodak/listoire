import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import type { FailureCode, Frame, StoryBundle } from "../../contracts/story.ts";
import type { StoryDirector } from "../story-runtime/director.ts";
import { PassageText } from "./PassageText.tsx";
import { CheckpointControls } from "./CheckpointControls.tsx";
import { ReadingControls } from "./ReadingControls.tsx";
import type { PresentationSession } from "../presentation/presentation-session.ts";
import type { ReadingPreferences } from "../../contracts/presentation.ts";
import { CharacterPanel } from "../character/CharacterPanel.tsx";
import { ReactBitsLayer } from "../presentation/react-bits/ReactBitsLayer.tsx";
import "./reader.css";

interface Props {
  bundle: StoryBundle;
  director: StoryDirector;
  presentation: PresentationSession;
  backup: () => Promise<void>;
  preferences: ReadingPreferences;
  onPreferencesChange: (preferences: ReadingPreferences) => void;
  focusPassage?: boolean;
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
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const page = useRef<HTMLElement>(null);
  useLayoutEffect(
    () => (page.current ? presentation.bindPage(page.current) : undefined),
    [presentation],
  );
  const interactionDisabled = state.busy || Boolean(failure);
  const media = useSyncExternalStore(presentation.subscribe, presentation.getSnapshot);
  const instant = preferences.reveal === "instant" || state.restored;
  const choicesDisabled = interactionDisabled || media.blocking;
  const className = `reader font-${preferences.fontFamily} text-${preferences.fontSize} lines-${preferences.lineHeight}`;
  const choose = (id: string) => {
    void director.choose(id, state.occurrenceId!);
  };
  useEffect(() => {
    if (player.focusPassage !== false) heading.current?.focus();
  }, [state.occurrenceId, player.focusPassage]);

  return (
    <main
      ref={page}
      id="story"
      className={className}
      lang={bundle.locale}
      aria-busy={state.busy}
      style={{ visibility: media.departed ? "hidden" : undefined }}
    >
      <div className="reader-toolbar">
        {bundle.authored && <PageNavigation director={director} state={state} />}
        <ReadingControls
          preferences={preferences}
          onChange={onPreferencesChange}
          presentation={presentation}
          voices={presentation.voices}
          open={preferencesOpen}
          onOpenChange={(open) => {
            setPreferencesOpen(open);
            if (open && characterOpen) onCharacterToggle();
          }}
        />
        <CharacterPanel
          bundle={bundle}
          frame={state.frame}
          profile={state.character}
          open={characterOpen}
          onToggle={() => {
            setPreferencesOpen(false);
            onCharacterToggle();
          }}
        />
      </div>
      <p className="eyebrow">
        {bundle.title} · {bundle.chapter}
      </p>
      <h1 ref={heading} tabIndex={-1}>
        {scene.title}
      </h1>
      <PassageText
        bundle={bundle}
        presentation={presentation}
        frame={state.frame}
        instant={instant}
        media={media}
        disabled={choicesDisabled}
        onChoose={choose}
      />
      {media.layers
        .filter((layer) => layer.blockId === "page" || layer.blockId === "scene")
        .map((layer) => (
          <div key={layer.id} className="page-effect">
            <ReactBitsLayer effect={layer.effect} />
          </div>
        ))}
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

function PageNavigation({
  director,
  state,
}: {
  director: StoryDirector;
  state: ReturnType<StoryDirector["getSnapshot"]>;
}) {
  const { t } = useTranslation();
  return (
    <div className="page-navigation">
      <button
        disabled={state.busy || !state.canGoBack}
        onClick={() => {
          void director.back();
        }}
      >
        {t("previousPage")}
      </button>
      <button
        disabled={state.busy}
        onClick={() => {
          void director.replay();
        }}
      >
        {t("replayPage")}
      </button>
    </div>
  );
}
