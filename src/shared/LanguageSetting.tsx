import { useRef } from "react";
import { useTranslation } from "react-i18next";
import type { Locale, ReaderSettings } from "../contracts/story.ts";
import { ToolbarGlyph } from "./ToolbarGlyph.tsx";

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
  compact?: boolean;
  onChange: (language: ReaderSettings["language"]) => void;
}

export function LanguageSetting({ language, busy, onChange, compact = false }: Props) {
  const { t } = useTranslation();
  const details = useRef<HTMLDetailsElement>(null);
  const names: Record<string, string> = { en: "English", fr: "Français" };
  return (
    <div className={`language-controls${compact ? " language-controls-compact" : ""}`}>
      <details
        ref={details}
        className="language-picker"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            details.current!.open = false;
            details.current!.querySelector("summary")!.focus();
          }
        }}
        onBlur={(event) => {
          // Safari pointer clicks can blur the summary without focusing the option.
          if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget))
            event.currentTarget.open = false;
        }}
      >
        <summary role="button" aria-label={`${t("language")}: ${names[language]}`}>
          <Flag language={language} />
          <span lang={language}>{compact ? language.toUpperCase() : names[language]}</span>
          {!compact && (
            <ToolbarGlyph
              name="chevron"
              className="language-chevron"
              viewBox="0 0 20 20"
              width="16"
              height="16"
              strokeWidth="1.5"
              strokeLinecap="butt"
              strokeLinejoin="miter"
            />
          )}
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
                details.current!.querySelector("summary")!.focus();
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
