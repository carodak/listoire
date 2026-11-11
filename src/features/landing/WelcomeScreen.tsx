import { appPath } from "../../contracts/app-path.ts";
import { useTranslation } from "react-i18next";
import { useWelcomeIntro } from "./use-welcome-intro.ts";
import "./welcome.css";

interface Props {
  onPlay: () => void;
}

export function WelcomeScreen({ onPlay }: Props) {
  const { t } = useTranslation();
  const subtitle = t("welcome.subtitle");
  const intro = useWelcomeIntro(subtitle);
  return (
    <main id="welcome" className="welcome">
      <h1>{t("welcome.title")}</h1>
      <p className="welcome-subtitle">
        <span className="sr-only">{subtitle}</span>
        <span className="subtitle-space" aria-hidden="true">
          {subtitle}
        </span>
        <span className="subtitle-reveal" aria-hidden="true">
          {intro.visibleText}
        </span>
      </p>
      <div className={`welcome-actions${intro.complete ? " ready" : ""}`}>
        <button className="welcome-play" disabled={!intro.complete} onClick={onPlay}>
          {t("welcome.play")}
        </button>
        <a className="welcome-create" href={appPath("editor")}>
          Story Editor
        </a>
      </div>
    </main>
  );
}
