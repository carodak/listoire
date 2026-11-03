import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ReaderSettings } from "../contracts/story.ts";
import type { SaveManager } from "../persistence/save-manager.ts";
import { WelcomeScreen } from "../features/landing/WelcomeScreen.tsx";
import { ReadingSession } from "./ReadingSession.tsx";
import { LanguageSetting } from "./LanguageSetting.tsx";

interface Props {
  saves: SaveManager;
  initialSettings: ReaderSettings;
}

export function App({ saves, initialSettings }: Props) {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState(initialSettings);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsFailed, setSettingsFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    document.documentElement.lang = settings.language;
    void i18n.changeLanguage(settings.language);
  }, [settings.language, i18n]);

  async function changeSettings(change: Partial<ReaderSettings>) {
    if (settingsBusy) return;
    const next = { ...settings, ...change };
    setSettings(next);
    setSettingsBusy(true);
    setSettingsFailed(false);
    try {
      await saves.saveSettings(next);
    } catch {
      setSettingsFailed(true);
    } finally {
      setSettingsBusy(false);
    }
  }

  return (
    <div className={entered ? "reader-shell" : undefined}>
      <a className="skip-link" href={entered ? "#story" : "#welcome"}>
        {t("skip")}
      </a>
      <header className="site-header">
        <button className="wordmark" onClick={() => setEntered(false)} aria-label={t("home")}>
          listoire<span aria-hidden="true">.</span>
        </button>
        <LanguageSetting
          language={settings.language}
          busy={settingsBusy}
          onChange={(language) => {
            void changeSettings({ language });
          }}
        />
      </header>
      {settingsFailed && (
        <p className="notice" role="alert">
          {t("settingsFailed")}
        </p>
      )}
      {entered ? (
        <>
          <ReadingSession
            key={`${settings.language}:${reload}`}
            locale={settings.language}
            saves={saves}
            retry={() => setReload((value) => value + 1)}
          />
        </>
      ) : (
        <WelcomeScreen key={settings.language} onPlay={() => setEntered(true)} />
      )}
    </div>
  );
}
