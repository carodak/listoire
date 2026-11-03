import { useRef } from "react";
import { useTranslation } from "react-i18next";
import type { Locale, ReaderSettings } from "../contracts/story.ts";

function Flag({ language }: { language: Locale }) {
  return (
    <svg className="language-flag" viewBox="0 0 60 30" aria-hidden="true">
      {language === "fr" ? (
        <>
          <path fill="#002395" d="M0 0h20v30H0z" />
          <path fill="#fff" d="M20 0h20v30H20z" />
          <path fill="#ed2939" d="M40 0h20v30H40z" />
        </>
      ) : (
        <>
          <path fill="#012169" d="M0 0h60v30H0z" />
          <path stroke="#fff" strokeWidth="6" d="m0 0 60 30M60 0 0 30" />
          <path stroke="#c8102e" strokeWidth="2" d="m0 0 60 30M60 0 0 30" />
          <path stroke="#fff" strokeWidth="10" d="M30 0v30M0 15h60" />
          <path stroke="#c8102e" strokeWidth="6" d="M30 0v30M0 15h60" />
        </>
      )}
    </svg>
  );
}

interface Props {
  language: Locale;
  busy: boolean;
  onChange: (language: ReaderSettings["language"]) => void;
}

export function LanguageSetting({ language, busy, onChange }: Props) {
  const { t } = useTranslation();
  const details = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  const names: Record<string, string> = { en: "English", fr: "Français" };
  return (
    <div className="language-controls">
      <details
        ref={details}
        className="language-picker"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            details.current!.open = false;
            summary.current?.focus();
          }
        }}
        onBlur={(event) => {
          // Safari pointer clicks can blur the summary without focusing the option.
          if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget))
            event.currentTarget.open = false;
        }}
      >
        <summary role="button" ref={summary} aria-label={`${t("language")}: ${names[language]}`}>
          <Flag language={language} />
          <span lang={language}>{names[language]}</span>
          <span aria-hidden="true">⌄</span>
        </summary>
        <div className="language-options" role="group" aria-label={t("language")}>
          <p className="language-prompt">{t("changeLanguage")}</p>
          {(["en", "fr"] as const).map((locale) => (
            <button
              key={locale}
              lang={locale}
              disabled={busy}
              aria-pressed={locale === language}
              onClick={() => {
                details.current!.open = false;
                summary.current?.focus();
                onChange(locale);
              }}
            >
              <Flag language={locale} />
              {names[locale]}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
