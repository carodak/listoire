import { useTranslation } from "react-i18next";
import type { TFunction, i18n as I18n } from "i18next";
import type { CombatOption } from "../../contracts/game.ts";
import type { StoryBundle } from "../../contracts/story.ts";

export function chanceLabel(probability: number, t: TFunction, i18n: I18n) {
  return t("combatInfo.chance", { chance: percentage(probability, i18n) });
}
function percentage(probability: number, i18n: I18n) {
  return new Intl.NumberFormat(i18n.language, {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(probability);
}
export function optionName(bundle: StoryBundle, option: CombatOption) {
  const move = option.move;
  if (move.kind !== "ability" && move.kind !== "item") return undefined;
  const entries = move.kind === "ability" ? bundle.game?.abilities : bundle.game?.items;
  return entries?.find((entry) => entry.id === move.id)?.name;
}
export function CombatOptionDetails({
  bundle,
  option,
}: {
  bundle: StoryBundle;
  option: CombatOption;
}) {
  const { t, i18n } = useTranslation();
  const name = optionName(bundle, option);
  const kind = option.move.kind;
  return (
    <section className="combat-option-details">
      {name && <strong>{name}</strong>}
      {(kind === "attack" || kind === "ability") && <p>{t(`combatInfo.${kind}`)}</p>}
      {option.attackTable && <AttackTable option={option} />}
      {option.ranks && <RankTable option={option} />}
      {kind === "flee" && (
        <p>
          {t("combatInfo.flee", { threshold: option.check?.threshold })}{" "}
          {chanceLabel(option.probability, t, i18n)}
        </p>
      )}
      {kind === "flee" && <p>{t("combatInfo.fleeRisk")}</p>}
      {kind === "item" && <p>{t("combatInfo.item", { count: option.healing })}</p>}
    </section>
  );
}
function RankTable({ option }: { option: CombatOption }) {
  const { t, i18n } = useTranslation();
  return (
    <>
      <table className="combat-info-table">
        <caption>{t("combatInfo.currentRank")}</caption>
        <thead>
          <tr>
            <th>{t("combatInfo.rank")}</th>
            <th>d6</th>
            <th>{t("combatInfo.damage")}</th>
            <th>{t("combatInfo.odds")}</th>
          </tr>
        </thead>
        <tbody>
          {option.ranks?.map((row) => (
            <tr key={row.rank} data-current={row.rank === option.rank}>
              <td>{row.rank}</td>
              <td>≥ {row.threshold}</td>
              <td>{row.damage}</td>
              <td>{percentage(row.probability, i18n)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>{t("combatInfo.rankNote")}</p>
    </>
  );
}

function AttackTable({ option }: { option: CombatOption }) {
  const { t } = useTranslation();
  return (
    <table className="combat-info-table">
      <caption>
        {option.damage?.attribute} {option.damage?.score} · bonus +{option.damage?.bonus} ·{" "}
        {t("combatInfo.gear")} +{option.damage?.equipment}
      </caption>
      <thead>
        <tr>
          <th>{t("combatInfo.die")}</th>
          <th>{t("combatInfo.damage")}</th>
        </tr>
      </thead>
      <tbody>
        {option.attackTable?.map((row) => (
          <tr key={row.die}>
            <td>{row.die}</td>
            <td>{row.damage}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
