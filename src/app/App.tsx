import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ReaderSettings, Locale } from "../contracts/story.ts";
import type { SaveManager } from "../persistence/save-manager.ts";
import { WelcomeScreen } from "../features/landing/WelcomeScreen.tsx";
import { ReadingSession } from "./ReadingSession.tsx";
import { defaultReadingPreferences } from "../contracts/presentation.ts";
import { LanguageSetting } from "../shared/LanguageSetting.tsx";

interface Props {
  saves: SaveManager;
  initialSettings: ReaderSettings;
}

export function App({ saves, initialSettings }: Props) {
  const { t } = useTranslation();
  const { settings, settingsBusy, settingsFailed, changeSettings } = useReaderSettings(
    saves,
    initialSettings,
  );
  const [reload, setReload] = useState(0);
  const [entered, setEntered] = useState(false);

  const changeLanguage = (language: Locale) => {
    if (language === "en" || language === "fr") void changeSettings({ language });
  };

  return (
    <div className={entered ? "reader-shell" : undefined}>
      <a className="skip-link" href={entered ? "#story" : "#welcome"}>
        {t("skip")}
      </a>
      {!entered && (
        <header className="site-header">
          <span className="wordmark">
            listoire<span aria-hidden="true">.</span>
          </span>
          <LanguageSetting
            language={settings.language}
            busy={settingsBusy}
            onChange={(language) => {
              void changeSettings({ language });
            }}
          />
        </header>
      )}
      {settingsFailed && (
        <p className="notice" role="alert">
          {t("settingsFailed")}
        </p>
      )}
      {entered ? (
        <ReadingSession
          key={`${settings.language}:${reload}`}
          locale={settings.language}
          saves={saves}
          preferences={settings.reading ?? defaultReadingPreferences}
          hasPreferences={Boolean(settings.reading)}
          onPreferencesChange={(reading) => {
            void changeSettings({ reading });
          }}
          retry={() => setReload((value) => value + 1)}
          onHome={() => setEntered(false)}
          onLanguageChange={changeLanguage}
          languageBusy={settingsBusy}
        />
      ) : (
        <WelcomeScreen key={settings.language} onPlay={() => setEntered(true)} />
      )}
    </div>
  );
}

function useReaderSettings(saves: SaveManager, initialSettings: ReaderSettings) {
  const [settings, setSettings] = useState(initialSettings);
  const latestSettings = useRef(initialSettings);
  const settingsWrites = useRef<Promise<void>>(Promise.resolve());
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsFailed, setSettingsFailed] = useState(false);
  const { i18n } = useTranslation();
  useEffect(() => {
    document.documentElement.lang = settings.language;
    void i18n.changeLanguage(settings.language);
  }, [settings.language, i18n]);

  async function changeSettings(change: Partial<ReaderSettings>) {
    const next = { ...latestSettings.current, ...change };
    latestSettings.current = next;
    setSettings(next);
    setSettingsBusy(true);
    setSettingsFailed(false);
    const write = settingsWrites.current.catch(() => {}).then(() => saves.saveSettings(next));
    settingsWrites.current = write;
    try {
      await write;
      if (settingsWrites.current === write) setSettingsFailed(false);
    } catch {
      if (settingsWrites.current === write) setSettingsFailed(true);
    } finally {
      if (settingsWrites.current === write) setSettingsBusy(false);
    }
  }
  return { settings, settingsBusy, settingsFailed, changeSettings };
}
