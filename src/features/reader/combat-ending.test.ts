import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { I18nextProvider } from "react-i18next";
import { GamePanel } from "./GamePanel.tsx";
import { combatLines } from "./combat-log.ts";
import { fixtureBundle } from "../../test-fixtures.ts";
import { GameStateSchema } from "../../contracts/game.ts";
import type { ReaderController } from "../../contracts/story.ts";
import { i18n } from "../../i18n/i18n.ts";
import { createCharacter } from "../character/create-character.ts";

const endings = [
  ["en", "escaped", { fled: true }, "Escaped", "You escape!"],
  ["fr", "escaped", { fled: true }, "Fuite réussie", "Vous vous échappez !"],
  ["en", "defeat", { fled: false, received: 3 }, "Defeated", "3 damage received."],
  ["fr", "defeat", { dealt: 2, received: 3 }, "Défaite", "3 dégâts subis."],
  ["en", "victory", { dealt: 7 }, "Victory!", "7 damage dealt."],
] as const;

it.each(endings)(
  "%s: a %s ending stays in the combat window",
  (locale, outcome, turn, title, line) => {
    const bundle = { ...fixtureBundle(), locale };
    const director = { finishEvent: async () => {} } as unknown as ReaderController;
    const game = GameStateSchema.parse({
      rng: 1,
      xp: 0,
      baseMaxHp: 6,
      inventory: [],
      equipment: {},
      pendingEvent: { choiceId: "after" },
      lastResult: { success: false, roll: 2, message: "legacy text", outcome, ...turn },
    });
    const state = {
      busy: false,
      failure: null,
      restored: false,
      attributeDetails: null,
      canGoBack: false,
      combatOptions: [],
      checkOptions: {},
      occurrenceId: "test",
      frame: { passageId: "start", segments: [], choices: [] },
      character: createCharacter(["blast"], () => 4),
      game,
    };
    void i18n.changeLanguage(locale);
    const html = renderToStaticMarkup(
      createElement(
        I18nextProvider,
        { i18n },
        createElement(GamePanel, { bundle, director, state }),
      ),
    );
    // Pass 7: the title and last lines appear in beats after the final roll (e2e
    // "reader-request" endings); a static render shows the same single combat window.
    expect(html).toContain("reader-combat-modal combat-ending");
    expect(i18n.t(`combat.outcome.${outcome}`)).toBe(title);
    expect(combatLines(game.lastResult!, i18n.t).join(" ")).toContain(line);
    // One window only: the separate story notice no longer opens, and no Continue without a failure.
    expect(html.match(/<dialog/g)).toHaveLength(1);
    expect(html).not.toContain("reader-modal-footer");
  },
);
