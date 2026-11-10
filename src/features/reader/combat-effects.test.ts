import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { I18nextProvider } from "react-i18next";
import { CombatEffects, endedEffects } from "./CombatEffects.tsx";
import { i18n } from "../../i18n/i18n.ts";

const stun = { ability: "bolt", kind: "stun", turns: 1 } as const;
const weaken = { ability: "hex", kind: "weaken", turns: 3 } as const;
const charm = { ability: "smile", kind: "charm", turns: 1 } as const;

it("finds effects that expired or were replaced, ignoring ones that only aged", () => {
  expect(endedEffects([stun, weaken], [{ ...weaken, turns: 2 }])).toEqual([stun]);
  expect(endedEffects([stun, weaken], [weaken, charm])).toEqual([stun]);
  expect(endedEffects([stun], [{ ...stun, turns: 3 }])).toEqual([]);
});

it.each([
  ["en", "Stunned (1)", "Weakened (3)"],
  ["fr", "Étourdissement (1)", "Affaiblissement (3)"],
])("labels active effects through i18n in %s", (locale, first, second) => {
  void i18n.changeLanguage(locale);
  const html = renderToStaticMarkup(
    createElement(
      I18nextProvider,
      { i18n },
      createElement(CombatEffects, { effects: [stun, weaken] }),
    ),
  );
  expect(html).toContain(`>${first}</span>`);
  expect(html).toContain(`>${second}</span>`);
  expect(html).not.toContain("combat-effect-ended");
});
