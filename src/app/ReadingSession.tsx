import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Locale, StoryBundle } from "../contracts/story.ts";
import { loadBundle, loadManifest } from "../features/story-runtime/bundle-loader.ts";
import type { SaveManager } from "../persistence/save-manager.ts";
import type { StoryDirector } from "../features/story-runtime/director.ts";
import { StoryPlayer } from "../features/reader/StoryPlayer.tsx";
import { createPlayer } from "./create-player.ts";

interface Props {
  locale: Locale;
  saves: SaveManager;
  retry: () => void;
}

export function ReadingSession({ locale, saves, retry }: Props) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const [player, setPlayer] = useState<{ bundle: StoryBundle; director: StoryDirector } | null>(
    null,
  );

  useEffect(() => {
    const scope = new AbortController();
    let director: StoryDirector | undefined;
    void loadManifest(scope.signal)
      .then((manifest) =>
        loadBundle(
          manifest.locales.includes(locale) ? locale : manifest.defaultLocale,
          scope.signal,
        ),
      )
      .then(async (bundle) => {
        if (scope.signal.aborted) return;
        director = await createPlayer(bundle, saves);
        if (scope.signal.aborted) {
          director.dispose();
          return;
        }
        setPlayer({ bundle, director });
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
      <StoryPlayer {...player} backup={backup} />
    </>
  ) : (
    <main id="story" className="loading" role="status">
      {t("loading")}
    </main>
  );
}
