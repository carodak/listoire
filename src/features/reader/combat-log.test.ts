import type { TFunction } from "i18next";
import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { combatLines, useCombatLog } from "./combat-log.ts";

const t = ((key: string, options?: { count?: number }) =>
  `${key}(${options?.count})`) as unknown as TFunction;
const result = (extra: object) => ({ success: true, roll: 4, message: "legacy text", ...extra });

it("lists your attack before the enemy's, formatted through i18n", () => {
  expect(combatLines(result({ dealt: 5, received: 2 }), t)).toEqual([
    "combat.youAttack(5)",
    "combat.enemyAttacks(2)",
  ]);
});

it("shows only your attack when the enemy did not strike back (victory)", () => {
  expect(combatLines(result({ dealt: 7 }), t)).toEqual(["combat.youAttack(7)"]);
});

it("keeps a missed attack as an explicit 0 and falls back to the message for old saves", () => {
  expect(combatLines(result({ dealt: 0, received: 3 }), t)[0]).toBe("combat.youAttack(0)");
  expect(combatLines(result({}), t)).toEqual(["legacy text"]);
});

it("is busy from the first render of a settled result, before its beats are logged", () => {
  // A static render runs no effects: it is exactly the render between "dice settled" and the
  // first beat, where the fight must not look finished yet.
  const Probe = ({ ready }: { ready: boolean }) =>
    `busy:${useCombatLog(result({ dealt: 1, received: 6 }), ready, t).busy}`;
  expect(renderToStaticMarkup(createElement(Probe, { ready: true }))).toBe("busy:true");
  expect(renderToStaticMarkup(createElement(Probe, { ready: false }))).toBe("busy:false");
});
