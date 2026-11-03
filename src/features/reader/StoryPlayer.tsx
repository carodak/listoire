import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import type { FailureCode, StoryBundle } from "../../contracts/story.ts";
import type { StoryDirector } from "../story-runtime/director.ts";
import "./reader.css";

interface Props {
  bundle: StoryBundle;
  director: StoryDirector;
  backup: () => Promise<void>;
}

export function StoryPlayer({ bundle, director, backup }: Props) {
  const { t, i18n } = useTranslation();
  const state = useSyncExternalStore(director.subscribe, director.getSnapshot);
  const heading = useRef<HTMLHeadingElement>(null);
  const [localFailure, setLocalFailure] = useState<FailureCode | null>(null);
  const failure = state.failure ?? localFailure;
  useEffect(() => {
    if (state.occurrenceId) heading.current?.focus();
  }, [state.occurrenceId]);

  return (
    <main id="story" className="reader" lang={bundle.locale} aria-busy={state.busy}>
      <p className="eyebrow">{t("chapterOne", { lng: bundle.locale })}</p>
      <h1 ref={heading} tabIndex={-1}>
        {bundle.title}
      </h1>
      <div className="prose">
        {state.frame?.segments.map((segment) => (
          <p key={segment.id}>{segment.text}</p>
        ))}
      </div>
      {state.frame && (
        <nav className="choices" aria-label={t("choices")} lang={i18n.resolvedLanguage}>
          {state.frame.choices.map((choice) => (
            <button
              key={choice.id}
              className="choice"
              disabled={state.busy || Boolean(failure)}
              lang={bundle.locale}
              onClick={() => {
                void director.choose(choice.id, state.occurrenceId!);
              }}
            >
              <span>{choice.text}</span>
              <span aria-hidden="true">↗</span>
            </button>
          ))}
          {!state.frame.choices.length && <p className="ending">{t("end")}</p>}
        </nav>
      )}
      {failure && (
        <div className="notice" role="alert" lang={i18n.resolvedLanguage}>
          <p>{t(`errors.${failure}`)}</p>
          <button
            disabled={state.busy}
            onClick={() => {
              setLocalFailure(null);
              void director.load();
            }}
          >
            {t("retry")}
          </button>
        </div>
      )}
      <footer className="reader-footer" lang={i18n.resolvedLanguage}>
        <p role="status">{state.busy ? t("saving") : state.frame && !failure ? t("saved") : ""}</p>
        <div className="footer-actions">
          <button
            disabled={state.busy}
            onClick={() => {
              if (window.confirm(t("restartConfirm"))) {
                setLocalFailure(null);
                void director.restart();
              }
            }}
          >
            {t("restart")}
          </button>
          <button
            disabled={state.busy}
            onClick={() => {
              void backup().catch(() => {
                setLocalFailure("storage");
              });
            }}
          >
            {t("backup")}
          </button>
        </div>
      </footer>
    </main>
  );
}
