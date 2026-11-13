import { expect, test } from "./test.ts";
import { enterReader, fightToEnd, fixDice } from "./oree.ts";
import { startBeforeFirstFight } from "./oree-saves.ts";

for (const width of [360, 412])
  test(`probe ending at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await fixDice(page, 1);
    await startBeforeFirstFight(page);
    await enterReader(page, { skipIntro: false });
    await page.locator(".choices button").filter({ hasText: /^Fight/ }).first().click();
    const combat = page.locator(".reader-combat-modal");
    await fightToEnd(combat);
    await expect(combat.locator(".combat-ending-title")).toBeVisible();
    const info = await combat.evaluate((node) => {
      const box = (s: string) => node.querySelector(s)!.getBoundingClientRect();
      const title = node.querySelector<HTMLElement>(".combat-ending-title")!;
      const widths: Record<string, number[]> = {};
      for (const text of ["Victory!", "Escaped", "Defeated", "Charmed", "Victoire !", "Fuite réussie", "Défaite", "Adversaire charmé"]) {
        title.textContent = text;
        widths[text] = [22, 18, 16].map((size) => {
          title.style.fontSize = `${size}px`;
          return Math.round(title.getBoundingClientRect().width);
        });
      }
      const summary = box(".combat-summary");
      const enemy = box('[data-side="enemy"] .combatant-portrait');
      const player = box('[data-side="player"] .combatant-portrait');
      return { summary: Math.round(summary.width), portrait: Math.round(enemy.width), gap: Math.round(player.x - enemy.x - enemy.width), widths };
    });
    console.log(`ENDING ${width} ` + JSON.stringify(info));
  });
