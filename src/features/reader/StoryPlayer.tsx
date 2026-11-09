import { useCombatChoice } from "./use-combat-choice.ts";
import { ReaderToolbar } from "./ReaderToolbar.tsx";
import type { StoryPlayerProps as Props } from "./ReaderToolbar.tsx";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Ref } from "react";
import { useTranslation } from "react-i18next";
import type { FailureCode, Frame } from "../../contracts/story.ts";
import type { ReaderSnapshot } from "../../contracts/story.ts";
import { PassageText } from "./PassageText.tsx";
import { CheckpointControls } from "./CheckpointControls.tsx";
import { GamePanel } from "./GamePanel.tsx";
import { ReactBitsLayer } from "../presentation/react-bits/ReactBitsLayer.tsx";
import "./reader.css";
import { readerTheme } from "../presentation/reader-theme.ts";

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
  const [seenGameResults] = useState(() => new WeakSet<object>());
  // Restoring a saved page must not replay an old item/combat notification.
  useEffect(() => {
    if (state.restored && state.game?.lastResult && !state.game.pendingEvent)
      seenGameResults.add(state.game.lastResult);
  }, [state.restored, state.game?.lastResult, state.game?.pendingEvent, seenGameResults]);
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
      seenGameResults={seenGameResults}
    />
  );
}

interface ReaderPassageProps {
  player: Props;
  state: ReaderSnapshot & { frame: Frame };
  characterOpen: boolean;
  onCharacterToggle: () => void;
  failure: FailureCode | null;
  onFailure: (code: FailureCode | null) => void;
  seenGameResults: WeakSet<object>;
}

function ReaderPassage({
  player,
  state,
  failure,
  onFailure,
  characterOpen,
  onCharacterToggle,
  seenGameResults,
}: ReaderPassageProps) {
  const { bundle, director, presentation, backup, preferences } = player;
  const { t } = useTranslation();
  const scene = bundle.scenes?.[state.frame.passageId] ?? {
    title: bundle.title,
    progress: 0,
    photograph: false,
    notice: undefined,
  };
  const heading = useRef<HTMLHeadingElement>(null);
  const page = useRef<HTMLElement>(null);
  useLayoutEffect(() => presentation.bindPage(page.current!), [presentation]);
  const media = useSyncExternalStore(presentation.subscribe, presentation.getSnapshot);
  const { combatReady, choose, choicesDisabled, resumeCombat } = useCombatChoice(
    player,
    state,
    Boolean(failure) || media.blocking,
  );
  const instant = preferences.reveal === "instant" || state.restored;
  const className = `reader font-${preferences.fontFamily} text-${preferences.fontSize} lines-${preferences.lineHeight}`;
  useEffect(() => {
    if (!player.preview) heading.current?.focus();
  }, [state.occurrenceId, player.preview]);

  return (
    <main
      ref={page}
      id="story"
      className={className}
      lang={bundle.locale}
      aria-busy={state.busy}
      style={pageStyle(player)}
    >
      <ReaderToolbar
        player={player}
        state={state}
        characterOpen={characterOpen}
        onCharacterToggle={onCharacterToggle}
      />
      <div className="reader-board" style={{ visibility: media.departed ? "hidden" : undefined }}>
        <GamePanel
          bundle={bundle}
          director={director}
          state={state}
          combatReady={combatReady}
          seenResults={seenGameResults}
          presentation={presentation}
        />
        <PassageText
          heading={<StoryHeading title={scene.title} headingRef={heading} />}
          bundle={bundle}
          presentation={presentation}
          frame={state.frame}
          instant={instant}
          media={media}
          disabled={choicesDisabled}
          onChoose={choose}
          resumeCombat={resumeCombat}
          checkOptions={state.checkOptions}
        >
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
        </PassageText>
      </div>
      <PageEffects layers={media.layers} />
    </main>
  );
}

interface StoryHeadingProps {
  title: string;
  headingRef: Ref<HTMLHeadingElement>;
}

function StoryHeading({ title, headingRef }: StoryHeadingProps) {
  return (
    <header className="story-scene-heading">
      <div className="story-heading-copy">
        <h1 ref={headingRef} tabIndex={-1}>
          {title}
        </h1>
        <span className="scene-heading-rule" aria-hidden="true" />
      </div>
    </header>
  );
}

function PageEffects({
  layers,
}: {
  layers: import("../presentation/playback-context.ts").PresentationState["layers"];
}) {
  return (
    <>
      {layers
        .filter((layer) => layer.blockId === "page" || layer.blockId === "scene")
        .map((layer) => (
          <div key={layer.id} className="page-effect">
            <ReactBitsLayer effect={layer.effect} />
          </div>
        ))}
    </>
  );
}

function pageStyle({ bundle, preferences }: Pick<Props, "bundle" | "preferences">) {
  return readerTheme(
    preferences.backgroundColor ?? bundle.readingDefaults?.backgroundColor,
    preferences.dropCapColor ?? bundle.readingDefaults?.dropCapColor,
  );
}
