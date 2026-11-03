import { useTranslation } from "react-i18next";
import type { Frame, Locale } from "../../contracts/story.ts";

export function ChoiceList({
  frame,
  locale,
  disabled,
  onChoose,
}: {
  frame: Frame;
  locale: Locale;
  disabled: boolean;
  onChoose: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  return (
    <nav className="choices" aria-label={t("choices")} lang={i18n.resolvedLanguage}>
      {frame.choices.map((choice) => (
        <button
          key={choice.id}
          className="choice"
          disabled={disabled}
          lang={locale}
          onClick={() => onChoose(choice.id)}
        >
          <span>{choice.text}</span>
          <span aria-hidden="true">↗</span>
        </button>
      ))}
      {!frame.choices.length && <p className="ending">{t("end")}</p>}
    </nav>
  );
}
