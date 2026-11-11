import { expect, it } from "vitest";
import type { FailureCode } from "../contracts/story.ts";
import { i18n } from "./i18n.ts";

function keys(value: unknown, prefix = ""): string[] {
  return value && typeof value === "object"
    ? Object.entries(value).flatMap(([key, child]) =>
        keys(child, prefix ? `${prefix}.${key}` : key),
      )
    : [prefix];
}

it("has every interface text in both English and French", () => {
  const english = keys(i18n.getResourceBundle("en", "translation"));
  const french = keys(i18n.getResourceBundle("fr", "translation"));
  expect(french.filter((key) => !english.includes(key))).toEqual([]);
  expect(english.filter((key) => !french.includes(key))).toEqual([]);
});

it("explains every reader failure, a failed backup download included (REVIEW #7)", () => {
  const codes: Record<FailureCode, true> = {
    content: true,
    "save-invalid": true,
    "save-incompatible": true,
    "save-conflict": true,
    storage: true,
    backup: true,
  };
  for (const locale of ["en", "fr"])
    for (const code of Object.keys(codes))
      expect(i18n.exists(`errors.${code}`, { lng: locale }), `${locale} ${code}`).toBe(true);
  expect(i18n.t("errors.backup", { lng: "fr" })).not.toBe(i18n.t("errors.storage", { lng: "fr" }));
});

it("translates the check, dice, equipment, combat help and video texts (REVIEW #5)", () => {
  const french = i18n.getFixedT("fr");
  const english = i18n.getFixedT("en");
  for (const key of [
    "welcome.editor",
    "openEditor",
    "combat.fight",
    "check.title",
    "check.retry",
    "dice.results",
    "equipment.equip",
    "equipment.locked",
    "combatInfo.attack",
    "combatInfo.rankNote",
    "video.loading",
  ]) {
    expect(i18n.exists(key, { lng: "en" }), key).toBe(true);
    expect(french(key), key).not.toBe(english(key));
  }
  const option = { attribute: "DEX", comparison: "≤", threshold: 12, sides: 20 };
  expect(english("check.test", option)).toBe("Roll DEX · Roll ≤ 12/20");
  expect(french("check.test", option)).toBe("Jet de DEX · Obtenir ≤ 12/20");
  expect(french("combatInfo.flee", { threshold: 9 })).toBe("Lance un d20 : 9 ou moins pour fuir.");
});
