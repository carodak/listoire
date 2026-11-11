import { appPath } from "../contracts/app-path.ts";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Locale, StoryBundle } from "../contracts/story.ts";
import { loadBundle, loadManifest } from "../features/story-runtime/bundle-loader.ts";
import type { SaveManager } from "../persistence/save-manager.ts";
import type { PresentationSession } from "../features/presentation/presentation-session.ts";
import type { ReaderNotesPort } from "../contracts/reader-notes.ts";
import type { StoryDirector } from "../features/story-runtime/director.ts";
import { StoryPlayer } from "../features/reader/StoryPlayer.tsx";
import type { ReadingPreferences } from "../contracts/presentation.ts";
import { createPlayer } from "./create-player.ts";
import { readActiveProject } from "../features/editor/default-project.ts";
import { compileInWorker } from "../features/editor/compile-client.ts";
import { download } from "../features/editor/downloads.ts";

interface Props {
  locale: Locale;
  onHome: () => void;
  onLanguageChange: (locale: Locale) => void;
  languageBusy: boolean;
  saves: SaveManager;
  retry: () => void;
  preferences: ReadingPreferences;
  hasPreferences: boolean;
  onPreferencesChange: (preferences: ReadingPreferences) => void;
}

export function ReadingSession({
  locale,
  onHome,
  onLanguageChange,
  languageBusy,
  saves,
  retry,
  preferences,
  hasPreferences,
  onPreferencesChange,
}: Props) {
  const { t } = useTranslation();
  const { player, failed } = useReadingPlayer(locale, saves, preferences, hasPreferences);

  async function backup() {
    if (!player) return;
    const { bundle } = player;
    download(`listoire-${bundle.storyId}-${bundle.locale}.json`, await saves.backup(bundle));
  }

  if (failed)
    return (
      <main id="story" className="notice" role="alert">
        <p>{t("errors.content")}</p>
        <p>{failed}</p>
        <a href={appPath("editor")}>{t("openEditor")}</a>
        <button onClick={retry}>{t("retry")}</button>
      </main>
    );
  return player ? (
    <>
      {player.bundle.locale !== locale && (
        <p className="language-note" role="status">
          {t("storyFallback", { language: t(`languageNames.${player.bundle.locale}`) })}
        </p>
      )}
      <StoryPlayer
        {...player}
        backup={backup}
        onHome={onHome}
        onLanguageChange={onLanguageChange}
        languageBusy={languageBusy}
        preferences={effectivePreferences(player.bundle, preferences, hasPreferences)}
        onPreferencesChange={onPreferencesChange}
      />
    </>
  ) : (
    <main id="story" className="loading" role="status">
      {t("loading")}
    </main>
  );
}

function useReadingPlayer(
  locale: Locale,
  saves: SaveManager,
  preferences: ReadingPreferences,
  hasPreferences: boolean,
) {
  const initialPreferences = useRef(preferences);
  const initialHasPreferences = useRef(hasPreferences);
  const [failed, setFailed] = useState("");
  const [player, setPlayer] = useState<{
    bundle: StoryBundle;
    director: StoryDirector;
    presentation: PresentationSession;
    notes: ReaderNotesPort;
  } | null>(null);

  useEffect(() => {
    const scope = new AbortController();
    let director: StoryDirector | undefined;
    void loadReadingBundle(locale, scope.signal)
      .then(async ({ bundle, fromDraft }) => {
        if (scope.signal.aborted) return;
        const player = await createPlayer(
          bundle,
          saves,
          effectivePreferences(bundle, initialPreferences.current, initialHasPreferences.current),
          undefined,
          fromDraft,
        );
        director = player.director;
        if (scope.signal.aborted) {
          director.dispose();
          return;
        }
        setPlayer({ bundle, ...player });
        await director.load();
      })
      .catch((error) => {
        if (!scope.signal.aborted)
          setFailed(error instanceof Error ? error.message : "Content unavailable");
      });
    return () => {
      scope.abort();
      director?.dispose();
    };
  }, [locale, saves]);
  return { player, failed };
}

async function loadReadingBundle(locale: Locale, signal: AbortSignal) {
  const record = await readActiveProject(signal).catch(() => null);
  if (record) {
    const chosen = record.draft.languages[locale] ? locale : record.draft.defaultLocale;
    const bundles = await compileInWorker(record.draft, chosen);
    return { bundle: bundles[chosen]!, fromDraft: true };
  }
  const manifest = await loadManifest(signal);
  const chosen = manifest.locales.includes(locale) ? locale : manifest.defaultLocale;
  return { bundle: await loadBundle(chosen, signal), fromDraft: false };
}

function effectivePreferences(
  bundle: StoryBundle,
  preferences: ReadingPreferences,
  hasPreferences: boolean,
) {
  return hasPreferences ? preferences : (bundle.readingDefaults ?? preferences);
}
