import { TypographicText } from "../presentation/TypographicText.tsx";
import type { StoryBundle } from "../../contracts/story.ts";
import type { CheckOption } from "../../contracts/game.ts";
import { useTranslation } from "react-i18next";
import type { Frame, Locale } from "../../contracts/story.ts";

interface ChoiceListProps {
  frame: Frame;
  locale: Locale;
  disabled: boolean;
  onChoose: (id: string) => void;
  bundle?: StoryBundle;
  resumeCombat?: () => void;
  checkOptions?: Record<string, CheckOption>;
}

export function ChoiceList({
  frame,
  locale,
  disabled,
  onChoose,
  bundle,
  resumeCombat,
  checkOptions,
}: ChoiceListProps) {
  const { t, i18n } = useTranslation();
  const combatLabel = locale === "fr" ? "Combattre" : "Fight";
  if (resumeCombat)
    return (
      <nav className="choices" aria-label={t("choices")}>
        <button
          className="choice"
          aria-label={combatLabel}
          disabled={disabled}
          onClick={resumeCombat}
        >
          {combatLabel}
        </button>
      </nav>
    );
  return (
    <nav className="choices" aria-label={t("choices")} lang={i18n.resolvedLanguage}>
      {frame.choices.map((choice) => {
        const context = bundle ? checkContext(bundle, choice, checkOptions) : null;
        const combat = bundle?.game?.actions.some(
          (action) => action.id === choice.gameAction && action.kind === "combat",
        );
        return (
          <button
            key={choice.id}
            className="choice"
            aria-label={`${combat ? `${combatLabel} — ` : ""}${choice.text}${context ? ` (${context.test})` : ""}`}
            disabled={disabled}
            lang={locale}
            onClick={() => onChoose(choice.id)}
          >
            <span>
              {combat && `${combatLabel} — `}
              <TypographicText text={choice.text} typography={choice.typography} />
              {context && <small className="choice-check">({context.test})</small>}
            </span>
            <span aria-hidden="true">↗</span>
          </button>
        );
      })}
      {!frame.choices.length && <p className="ending">{t("end")}</p>}
    </nav>
  );
}

export function checkContext(
  bundle: StoryBundle,
  choice: Frame["choices"][number],
  options: Record<string, CheckOption> = {},
) {
  const action = bundle.game?.actions.find((action) => action.id === choice.gameAction);
  if (!action || !["stat-check", "ability-check"].includes(action.kind)) return null;
  const ability = bundle.game?.abilities.find((ability) => ability.id === action.reference);
  const attribute = action.kind === "stat-check" ? action.attribute : ability?.attribute;
  const french = bundle.locale.startsWith("fr");
  const option = options[action.id];
  return {
    option,
    purpose: action.kind === "stat-check" ? action.label : choice.text,
    test: option
      ? `${french ? "Jet de" : "Roll"} ${option.attribute} · ${french ? "Obtenir" : "Roll"} ${option.comparison} ${option.threshold}/${option.sides}`
      : `${french ? "Jet de" : "Roll"} ${attribute ?? ""} · ${action.kind === "stat-check" ? "d20" : "d6"}`,
  };
}
