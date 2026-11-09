import type { CombatOption } from "../../contracts/game.ts";
import type { StoryBundle } from "../../contracts/story.ts";

export function chanceLabel(probability: number, french: boolean) {
  return `${french ? "Réussite" : "Success"} : ${percentage(probability, french)}`;
}
function percentage(probability: number, french: boolean) {
  return new Intl.NumberFormat(french ? "fr" : "en", {
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
  const french = bundle.locale === "fr";
  const name = optionName(bundle, option);
  const kind = option.move.kind;
  return (
    <section className="combat-option-details">
      {name && <strong>{name}</strong>}
      {kind === "attack" && (
        <p>
          {french
            ? "L’attaque touche toujours. Lance un d6 pour connaître les dégâts."
            : "Your attack always hits. Roll a d6 to find the damage."}
        </p>
      )}
      {kind === "ability" && (
        <p>
          {french
            ? "Lance un d6. Si tu atteins le nombre indiqué, la capacité réussit. Sinon, elle ne fait aucun dégât."
            : "Roll a d6. Reach the number shown to succeed. Otherwise, the ability deals no damage."}
        </p>
      )}
      {option.attackTable && <AttackTable option={option} french={french} />}
      {option.ranks && <RankTable option={option} french={french} />}
      {kind === "flee" && (
        <p>
          {french
            ? `Lance un d20 : ${option.check?.threshold} ou moins pour fuir.`
            : `Roll a d20: ${option.check?.threshold} or less to escape.`}{" "}
          {chanceLabel(option.probability, french)}
        </p>
      )}
      {kind === "flee" && (
        <p>
          {french
            ? "Si tu rates, l’adversaire peut répliquer."
            : "If you fail, your opponent may strike back."}
        </p>
      )}
      {kind === "item" && (
        <p>
          {french
            ? `Récupère jusqu’à ${option.healing} PV, sans dépasser ton maximum. Aucun dé à lancer. L’objet est consommé et l’adversaire réplique.`
            : `Recover up to ${option.healing} HP, capped at your maximum. No die roll. The item is consumed and your opponent strikes back.`}
        </p>
      )}
    </section>
  );
}
function RankTable({ option, french }: { option: CombatOption; french: boolean }) {
  return (
    <>
      <table className="combat-info-table">
        <caption>
          {french ? "Le rang actuel est surligné." : "Your current rank is highlighted."}
        </caption>
        <thead>
          <tr>
            <th>{french ? "Rang" : "Rank"}</th>
            <th>d6</th>
            <th>{french ? "Dégâts" : "Damage"}</th>
            <th>Chance</th>
          </tr>
        </thead>
        <tbody>
          {option.ranks?.map((row) => (
            <tr key={row.rank} data-current={row.rank === option.rank}>
              <td>{row.rank}</td>
              <td>≥ {row.threshold}</td>
              <td>{row.damage}</td>
              <td>{percentage(row.probability, french)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        {french
          ? "Un rang plus élevé aide à réussir. Les dégâts d’un succès restent les mêmes."
          : "Higher ranks help you succeed. Successful hits deal the same damage."}
      </p>
    </>
  );
}

function AttackTable({ option, french }: { option: CombatOption; french: boolean }) {
  return (
    <table className="combat-info-table">
      <caption>
        {option.damage?.attribute} {option.damage?.score} · bonus +{option.damage?.bonus} ·{" "}
        {french ? "équipement" : "gear"} +{option.damage?.equipment}
      </caption>
      <thead>
        <tr>
          <th>{french ? "Dé" : "Die"}</th>
          <th>{french ? "Dégâts" : "Damage"}</th>
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
