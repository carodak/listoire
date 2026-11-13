import { expect, test } from "./test.ts";
import type { Locator, Page } from "@playwright/test";
import { i18n } from "../../src/i18n/i18n.ts";
import { withFixtureStory } from "./fixture-story.ts";
import {
  enterReader,
  fightToEnd,
  fixDice,
  next,
  playStory,
  reachCombat,
  readUntil,
  settlePage,
} from "./oree.ts";

test.setTimeout(90_000);

/** A French duel window before the first blow: odds, portraits, abilities; the balm in the first. */
async function checkFrenchCombat(page: Page, combat: Locator, first: boolean) {
  await expect(combat.getByRole("button", { name: /Lancer les/ })).toHaveCount(0);
  await expect(combat.locator(".combat-summary progress")).toHaveCount(2);
  await expect(combat.locator(".combatant-portrait img")).toHaveCount(2);
  await expect(combat.locator(".combatant-portrait img").first()).toBeVisible();
  await expect(combat.locator(".character-xp-track")).toHaveCount(0);
  await expect(combat.locator(".combat-ability-menu")).toHaveCount(0);
  const info = combat.locator(".combat-actions .reader-info summary").first();
  await info.click();
  await expect(combat.locator(".reader-info[open]")).toContainText("d6");
  await expect(combat.locator(".reader-info[open] tbody tr")).toHaveCount(6);
  const tooltip = (await combat.locator(".reader-info[open] .reader-info-content").boundingBox())!;
  expect(tooltip.x).toBeGreaterThanOrEqual(0);
  expect(tooltip.x + tooltip.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await info.click();
  await combat.getByRole("button", { name: "Utiliser une capacité", exact: true }).click();
  await expect(combat.locator(".combat-ability-menu button").first()).toContainText("33");
  await expect(combat.locator(".combatant-portrait")).toHaveCount(2);
  await expect(combat.locator(".combat-actions > .combat-action")).toHaveCount(4);
  if (!first) return;
  await expect(combat.locator(".combatant-name").first()).toHaveText("Ysée Valambre");
  const items = combat.getByRole("button", { name: "Utiliser un objet", exact: true });
  await items.click();
  await combat.locator(".combat-ability-menu button").filter({ hasText: "Baume de soin" }).click();
  await expect(items).toBeDisabled();
  await expect(combat.locator(".combat-log li").first()).toContainText(
    "Vous utilisez Baume de soin",
  );
}

/** Attacks until the French duel ends, checking each turn's die and log lines. */
async function winFrenchDuel(page: Page, combat: Locator) {
  let rolls = 0;
  let won = false;
  for (let turn = 0; (await combat.count()) && turn < 30; turn++) {
    if (await combat.locator(".combat-ending-title").count()) break;
    await combat.getByRole("button", { name: "Attaque simple", exact: true }).click();
    await expect(page.locator(".reader")).toHaveAttribute("aria-busy", "false");
    await expect(page.locator(".dice-roll")).toBeVisible();
    await expect(page.locator(".dice-result small").first()).toHaveText("d6");
    const log = combat.locator(".combat-log li");
    await expect(log.last()).toBeVisible();
    if (await page.locator(".combat-ending-title").count()) {
      // A won fight announces itself in the combat window, then continues on its own.
      await expect(page.locator(".combat-ending-title")).toHaveText("Victoire !");
      await expect(log.last()).toContainText("Vous attaquez…");
      won = true;
    } else {
      // Chronological: your attack, then the enemy's, as the newest entries.
      await expect(log.last()).toContainText("L’adversaire attaque…");
      await expect(log.nth((await log.count()) - 2)).toContainText("Vous attaquez…");
    }
    await expect(combat.locator(".combatant-hit")).toHaveCount(0); // reduced motion
    rolls++;
  }
  await expect(page.locator(".combat-ending")).toHaveCount(0, { timeout: 15000 });
  return { rolls, won };
}

/** Pass 7: the healing is a story page, and the HP it gave is a notification (French). */
async function careOfYsee(page: Page) {
  if ((await page.locator(".reader-copy").getAttribute("data-passage")) !== "soins") return false;
  await expect(page.locator(".reader-copy h1")).toHaveText("Les soins d’Ysée");
  const care = page.locator(".reward-card").filter({ hasText: "PV récupérés" }).last();
  await expect(care).toBeAttached();
  // Shown or waiting behind another card, it still counts down its own 10 s.
  const state = await care
    .locator(".reward-timer")
    .evaluate((bar) => bar.getAnimations()[0]?.playState ?? "none");
  expect(state).toBe("running");
  return true;
}

test("completes the French magic chapter with two combats and visible saved dice", async ({
  page,
}, info) => {
  await fixDice(page, 1); // this seed wins both duels
  await enterReader(page, { french: true });
  const combat = page.locator(".reader-combat-modal");
  let encounters = 0;
  let rolls = 0;
  let victories = 0;
  let cared = false;
  for (let step = 0; step < 46; step++) {
    if (await combat.count()) {
      await checkFrenchCombat(page, combat, ++encounters === 1);
      await page.screenshot({ path: info.outputPath(`combat-${encounters}.png`) });
      const duel = await winFrenchDuel(page, combat);
      rolls += duel.rolls;
      if (duel.won) victories++;
    }
    await settlePage(page);
    cared ||= await careOfYsee(page);
    if (await page.locator(".ending").count()) break;
    await next(page);
  }
  await expect(page.locator(".ending")).toBeVisible();
  expect(cared).toBe(true);
  expect(encounters).toBe(2);
  expect(victories).toBe(2);
  expect(rolls).toBeGreaterThanOrEqual(2);
  await expect(page.locator(".reader-copy h1")).toHaveText("Laisser une lumière");
});

for (const { title, seed, move, line, french = false } of [
  { title: "Defeated", seed: 3, move: "Basic attack", line: "damage received." }, // seed 3 loses
  { title: "Escaped", seed: 1, move: "Flee", line: "You escape!" },
  { title: "Défaite", seed: 3, move: "Attaque simple", line: "dégâts subis.", french: true },
  { title: "Fuite réussie", seed: 1, move: "Fuir", line: "Vous vous échappez !", french: true },
]) {
  test(`announces "${title}" in the combat window, then continues on its own`, async ({ page }) => {
    await fixDice(page, seed);
    await enterReader(page, { french });
    const combat = await reachCombat(page);
    // Pass 7: each turn plays in beats and the last one hides the actions before the outcome.
    const outcome = combat.locator(".combat-ending-title");
    const button = combat.getByRole("button", { name: move, exact: true, disabled: false });
    for (let turn = 0; turn < 30; turn++) {
      // One retrying check of the whole page: isEnabled() on a button that the last blow has
      // just removed waits for it to come back, and the ending then closed unseen.
      await expect(outcome.or(button)).toBeVisible({ timeout: 15000 });
      if (await outcome.count()) break;
      await button.click();
    }
    const ending = page.locator(".combat-ending");
    await expect(ending.locator(".combat-ending-title")).toHaveText(title);
    await expect(ending.locator(".combat-log li").last()).toContainText(line);
    await expect(
      ending.getByRole("button", { name: french ? "Continuer la lecture" : "Continue reading" }),
    ).toHaveCount(0);
    await expect(ending).toHaveCount(0, { timeout: 15000 });
    await expect(page.locator(".reader-modal")).toHaveCount(0);
  });
}

test("combat: info opens from the keyboard, items open in a popup inside the window", async ({
  page,
}) => {
  await fixDice(page, 1);
  await enterReader(page);
  const combat = await reachCombat(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  // "i" opens on click and from the keyboard (shared Info, native details).
  const info = combat.locator(".combat-actions .reader-info").first();
  await info.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(info).toHaveAttribute("open", "");
  await page.keyboard.press("Enter");
  await expect(info).not.toHaveAttribute("open", "");
  // Items open in a popup inside the combat window; Escape returns to the actions.
  const items = combat.getByRole("button", { name: "Use an item", exact: true });
  await items.click();
  const popup = combat.getByRole("dialog", { name: "Use an item" });
  await expect(popup).toBeVisible();
  const inside = (await popup.boundingBox())!;
  const window = (await combat.boundingBox())!;
  expect(inside.x).toBeGreaterThanOrEqual(window.x);
  expect(inside.x + inside.width).toBeLessThanOrEqual(window.x + window.width);
  await page.keyboard.press("Escape");
  await expect(popup).toHaveCount(0);
  await expect(combat).toBeVisible();
  await expect(items).toBeFocused();
});

/** The outcome title is centred between the two portraits, and inside the gap if it fits. */
async function outcomeBetweenPortraits(combat: Locator) {
  const [enemy, player, middle] = await Promise.all(
    [
      '[data-side="enemy"] .combatant-portrait',
      '[data-side="player"] .combatant-portrait',
      ".combat-ending-title",
    ].map(async (selector) => (await combat.locator(selector).boundingBox())!),
  );
  const gap = { left: enemy!.x + enemy!.width, right: player!.x };
  const centre = middle!.x + middle!.width / 2;
  expect(Math.abs(centre - (gap.left + gap.right) / 2)).toBeLessThan(2);
  // Inside the gap whenever it fits (mid-animation, a phone's portraits are still shrinking).
  if (gap.right - gap.left >= middle!.width) {
    expect(middle!.x).toBeGreaterThanOrEqual(gap.left - 1);
    expect(middle!.x + middle!.width).toBeLessThanOrEqual(gap.right + 1);
  }
}

/** On a phone, every outcome (English and French) is centred between the portraits and fits. */
async function outcomesFitOnPhone(combat: Locator) {
  const labels = ["en", "fr"].flatMap((locale) =>
    Object.values<string>(i18n.getResourceBundle(locale, "translation").combat.outcome),
  );
  const misfits = await combat.evaluate((node, labels) => {
    const box = (selector: string) => node.querySelector(selector)!.getBoundingClientRect();
    const title = node.querySelector<HTMLElement>(".combat-ending-title")!;
    const shown = title.textContent;
    const misfits = labels.filter((label) => {
      title.textContent = label;
      const left = box('[data-side="enemy"] .combatant-portrait').right;
      const right = box('[data-side="player"] .combatant-portrait').left;
      const middle = title.getBoundingClientRect();
      const offCentre = Math.abs(middle.left + middle.width / 2 - (left + right) / 2) >= 2;
      const spills = title.scrollWidth > title.clientWidth;
      return offCentre || spills || middle.left < left - 1 || middle.right > right + 1;
    });
    title.textContent = shown;
    return misfits;
  }, labels);
  expect(misfits).toEqual([]);
}

/** Records whether the combat window took its closing (fade-out) class. */
const watchFadeOut = (page: Page) =>
  page.evaluate(() => {
    new MutationObserver(() => {
      if (document.querySelector(".reader-combat-modal.combat-closing"))
        Object.assign(window, { fadedOut: true });
    }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"] });
  });

test("combat: two beats per turn, then the outcome between the portraits and a fade-out", async ({
  page,
}) => {
  await fixDice(page, 1); // wins the duel: 8 damage dealt, 2 received on the first turn
  await enterReader(page);
  const combat = await reachCombat(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await watchFadeOut(page);
  // Your blow, then a second later the enemy's, each with its hit and its log line.
  await combat.getByRole("button", { name: "Basic attack", exact: true }).click();
  const log = combat.locator(".combat-log li");
  await expect(log).toHaveCount(1);
  const acted = Date.now();
  await expect(log.first()).toContainText("damage dealt");
  await expect(combat.locator('[data-side="enemy"] .combatant-hit')).toBeAttached();
  await expect(combat.locator('[data-side="player"] .combatant-hit')).toHaveCount(0);
  await expect(combat.getByRole("button", { name: "Basic attack", exact: true })).toBeDisabled();
  await expect(log).toHaveCount(2);
  expect(Date.now() - acted).toBeGreaterThan(700);
  await expect(log.last()).toContainText("damage received");
  await expect(combat.locator('[data-side="player"] .combatant-hit')).toBeAttached();
  // The log keeps its height and shows the newest line.
  const height = await combat.locator(".combat-log").evaluate((list) => list.clientHeight);
  await fightToEnd(combat);
  expect(await combat.locator(".combat-log").evaluate((list) => list.clientHeight)).toBe(height);
  // The outcome stands between the portraits; the defeated side fades; then the window closes.
  await expect(combat.locator(".combat-ending-title")).toHaveText("Victory!");
  await outcomeBetweenPortraits(combat);
  await expect(combat.locator('[data-side="enemy"][data-defeated]')).toBeAttached();
  await expect(log.last()).toBeInViewport();
  await expect(combat).toHaveCount(0, { timeout: 5000 });
  expect(await page.evaluate(() => "fadedOut" in window)).toBe(true);
  await expect(page.locator(".reader-copy h1")).not.toHaveText("");
});

test("reduced motion keeps every combat step and the ending, without animation", async ({
  page,
}) => {
  await fixDice(page, 1);
  await enterReader(page);
  const combat = await reachCombat(page);
  await combat.getByRole("button", { name: "Basic attack", exact: true }).click();
  await expect(combat.locator(".combat-log li")).toHaveCount(2);
  await expect(combat.locator(".combatant-hit")).toHaveCount(0);
  await fightToEnd(combat);
  await expect(combat.locator(".combat-ending-title")).toHaveText("Victory!");
  await expect(combat.locator('[data-side="enemy"] .combatant-portrait')).toHaveCSS(
    "opacity",
    "0.08",
  );
  expect(await combat.evaluate((node) => node.getAnimations({ subtree: true }).length)).toBe(0);
  // Still, so measurable: every outcome fits between the portraits on a phone.
  for (const width of [412, 360]) {
    await page.setViewportSize({ width, height: page.viewportSize()!.height });
    await outcomesFitOnPhone(combat);
  }
  await expect(combat).toHaveCount(0, { timeout: 6000 });
});

test("aligns unnamed heroes with long opponent names, shows gallery portraits and keeps every action visible after dice", async ({
  page,
}, info) => {
  await page.route("**/stories/house/en.json", async (route) => {
    const response = await route.fetch();
    const bundle = await response.json();
    delete bundle.character.name;
    bundle.game.encounters[0].name = "Ysée Valambre, head teacher of the school of Orée";
    await route.fulfill({ json: bundle });
  });
  await enterReader(page);
  const fight = page.locator(".choices button").filter({ hasText: /^Fight/ });
  await (await readUntil(page, fight, 35)).click();
  const combat = page.locator(".reader-combat-modal");
  await expect(combat).toBeVisible();
  await expect(combat.locator(".combatant-name").nth(1)).toBeEmpty();
  await expect(combat.locator(".combatant-portrait img")).toHaveCount(2);
  await expect(combat.locator("svg.opponent-emblem")).toHaveCount(0);
  const hp = combat.locator(".combat-vital progress");
  expect((await hp.nth(0).boundingBox())!.y).toBeCloseTo((await hp.nth(1).boundingBox())!.y, 0);
  const details = combat.locator(".combat-actions .reader-info summary").nth(1);
  await details.click();
  await expect(combat.locator(".reader-info[open] tbody tr")).toHaveCount(4);
  await expect(combat.locator('.reader-info[open] tr[data-current="true"]')).toHaveCount(1);
  await details.click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await combat.getByRole("button", { name: "Basic attack", exact: true }).click();
  await expect(combat.getByRole("button", { name: "Basic attack", exact: true })).toBeEnabled();
  const actions = combat.locator(".combat-actions > .combat-action > button");
  for (let index = 0; index < 4; index++) {
    const bounds = (await actions.nth(index).boundingBox())!;
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  }
  await page.screenshot({ path: info.outputPath("compact-combat.png") });
});

test("a combat effect that ends fades out", async ({ page }) => {
  await fixDice(page, 19); // Dawn stuns the guardian for one turn; the next attack ends the stun.
  await withFixtureStory(page);
  await page.goto("/");
  await playStory(page);
  await page.getByRole("button", { name: "Walk to the gate" }).click();
  await page.getByRole("button", { name: "Fight the guardian" }).click();
  const combat = page.locator(".reader-combat-modal");
  await combat.getByRole("button", { name: "Use an ability" }).click();
  await combat.getByRole("button", { name: /^Dawn/ }).click();
  const effect = combat.locator(".combat-effect");
  await expect(effect).toHaveText("Stunned (1)");
  await combat.getByRole("button", { name: "Basic attack" }).click();
  const ended = combat.locator(".combat-effect-ended");
  await expect(ended).toHaveText("Stunned (1)");
  await expect(ended).toHaveAttribute("aria-hidden", "true");
  expect(await ended.evaluate((element) => element.getAnimations().length)).toBe(1);
  await expect(effect).toHaveCount(0);
});
