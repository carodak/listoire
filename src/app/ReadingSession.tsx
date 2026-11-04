import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Locale, StoryBundle } from "../contracts/story.ts";
import { loadBundle, loadManifest } from "../features/story-runtime/bundle-loader.ts";
import type { SaveManager } from "../persistence/save-manager.ts";
import type { PresentationSession } from "../features/presentation/presentation-session.ts";
import type { StoryDirector } from "../features/story-runtime/director.ts";
import { StoryPlayer } from "../features/reader/StoryPlayer.tsx";
import type { ReadingPreferences } from "../contracts/presentation.ts";
import { createPlayer } from "./create-player.ts";
import { readEditorRecord } from "../persistence/editor-store.ts";
import { hasLegacyArtwork, refreshPublishedArtwork } from "../contracts/artwork-refresh.ts";

interface Props {
  locale: Locale;
  saves: SaveManager;
  retry: () => void;
  preferences: ReadingPreferences;
  hasPreferences: boolean;
  onPreferencesChange: (preferences: ReadingPreferences) => void;
}

export function ReadingSession({
  locale,
  saves,
  retry,
  preferences,
  hasPreferences,
  onPreferencesChange,
}: Props) {
  const { t } = useTranslation();
  const initialPreferences = useRef(preferences);
  const initialHasPreferences = useRef(hasPreferences);
  const [failed, setFailed] = useState(false);
  const [player, setPlayer] = useState<{
    bundle: StoryBundle;
    director: StoryDirector;
    presentation: PresentationSession;
  } | null>(null);

  useEffect(() => {
    const scope = new AbortController();
    let director: StoryDirector | undefined;
    void readEditorRecord()
      .catch(() => null)
      .then(async (record) => {
        if (record?.published) {
          const published = record.published;
          const bundle =
            published.bundles[locale] ??
            published.bundles[record.draft.defaultLocale] ??
            Object.values(published.bundles)[0]!;
          if (!hasLegacyArtwork(bundle)) return bundle;
          try {
            const source = await loadBundle(bundle.locale, scope.signal);
            return refreshPublishedArtwork(bundle, source);
          } catch {
            // Preserve the published story when its optional artwork refresh is unavailable.
            return bundle;
          }
        }
        const manifest = await loadManifest(scope.signal);
        return loadBundle(
          manifest.locales.includes(locale) ? locale : manifest.defaultLocale,
          scope.signal,
        );
      })
      .then(async (bundle) => {
        if (scope.signal.aborted) return;
        const player = await createPlayer(
          bundle,
          saves,
          initialHasPreferences.current
            ? initialPreferences.current
            : (bundle.readingDefaults ?? initialPreferences.current),
        );
        director = player.director;
        if (scope.signal.aborted) {
          director.dispose();
          return;
        }
        setPlayer({ bundle, ...player });
        await director.load();
      })
      .catch(() => {
        if (!scope.signal.aborted) setFailed(true);
      });
    return () => {
      scope.abort();
      director?.dispose();
    };
  }, [locale, saves]);

  async function backup() {
    if (!player) return;
    const text = await saves.backup(player.bundle);
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `listoire-${player.bundle.storyId}-${player.bundle.locale}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (failed)
    return (
      <main id="story" className="notice" role="alert">
        <p>{t("errors.content")}</p>
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
        preferences={hasPreferences ? preferences : (player.bundle.readingDefaults ?? preferences)}
        onPreferencesChange={onPreferencesChange}
      />
    </>
  ) : (
    <main id="story" className="loading" role="status">
      {t("loading")}
    </main>
  );
}
