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
import { RewardNotifications, useRewards } from "./RewardNotifications.tsx";
import { ReactBitsLayer } from "../presentation/react-bits/ReactBitsLayer.tsx";
import type { PresentationState } from "../presentation/playback-context.ts";
import "./reader.css";
import { readerTheme } from "../presentation/reader-theme.ts";

export function StoryPlayer(props: Props) {
  const { t } = useTranslation();
  usePresentationLifecycle(props);
  const state = useSyncExternalStore(props.director.subscribe, props.director.getSnapshot);
  const [characterOpen, setCharacterOpen] = useState(false);
  const rewards = useRewards(state, props.bundle);
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
    <>
      <ReaderPassage
        key={state.occurrenceId!}
        player={props}
        state={{ ...state, frame }}
        characterOpen={characterOpen}
        onCharacterToggle={() => setCharacterOpen(!characterOpen)}
        failure={failure}
        onFailure={setLocalFailure}
      />
      <RewardNotifications {...rewards} style={pageStyle(props)} />
    </>
  );
}

function usePresentationLifecycle({ presentation, preferences }: Props) {
  useEffect(() => {
    presentation.configure(preferences);
  }, [presentation, preferences]);
  useEffect(() => {
    let resumeOnFocus = false;
    const visibility = () => {
      if (document.hidden) {
        resumeOnFocus = !presentation.getSnapshot().paused;
        presentation.pause();
      } else if (resumeOnFocus) {
        resumeOnFocus = false;
        presentation.resume();
      }
    };
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const reduce = () => presentation.skipCinematic();
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", reduce);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      motion.removeEventListener("change", reduce);
    };
  }, [presentation]);
}

interface ReaderPassageProps {
  player: Props;
  state: ReaderSnapshot & { frame: Frame };
  characterOpen: boolean;
  onCharacterToggle: () => void;
  failure: FailureCode | null;
  onFailure: (code: FailureCode | null) => void;
}

function ReaderPassage(props: ReaderPassageProps) {
  const { player, state, characterOpen, onCharacterToggle } = props;
  const { bundle, presentation, preferences } = player;
  const heading = useRef<HTMLHeadingElement>(null);
  const page = useRef<HTMLElement>(null);
  useLayoutEffect(() => presentation.bindPage(page.current!), [presentation]);
  const media = useSyncExternalStore(presentation.subscribe, presentation.getSnapshot);
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
      <ReaderBoard {...props} media={media} heading={heading} />
      <PageEffects layers={media.layers} />
    </main>
  );
}

function ReaderBoard({
  player,
  state,
  failure,
  onFailure,
  media,
  heading,
}: ReaderPassageProps & { media: PresentationState; heading: Ref<HTMLHeadingElement> }) {
  const { bundle, director, presentation, backup, preferences } = player;
  const { t } = useTranslation();
  const scene = bundle.scenes?.[state.frame.passageId];
  const { combatReady, choose, choicesDisabled, resumeCombat } = useCombatChoice(
    player,
    state,
    Boolean(failure) || media.blocking,
  );
  return (
    <div className="reader-board" style={{ visibility: media.departed ? "hidden" : undefined }}>
      <GamePanel
        bundle={bundle}
        director={director}
        state={state}
        combatReady={combatReady}
        presentation={presentation}
      />
      <PassageText
        heading={<StoryHeading title={scene?.title ?? bundle.title} headingRef={heading} />}
        bundle={bundle}
        presentation={presentation}
        frame={state.frame}
        instant={preferences.reveal === "instant" || state.restored}
        media={media}
        disabled={choicesDisabled}
        onChoose={choose}
        resumeCombat={resumeCombat}
        checkOptions={state.checkOptions}
      >
        <progress
          className="story-progress"
          value={scene?.progress ?? 0}
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

function PageEffects({ layers }: { layers: PresentationState["layers"] }) {
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
