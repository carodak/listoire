import { expect, type Locator, type Page } from "@playwright/test";

/** Helpers for the published Orée story, keyed by passage IDs instead of prose. */

export async function playStory(page: Page, french = false) {
  await page
    .getByRole("button", {
      name: french ? "Jouer à une histoire existante" : "Play an existing story",
    })
    .click();
}

export function onPage(page: Page, passageId: string) {
  return expect(page.locator(".reader-copy")).toHaveAttribute("data-passage", passageId);
}

export function firstChoice(page: Page) {
  return page.locator(".choices button").first();
}

/** Closes an item/story notice if one is open (combat and checks are left alone). */
export async function dismissNotice(page: Page) {
  const notice = page.locator(".reader-modal:not(.reader-combat-modal):not(.check-roll-modal)");
  if (await notice.count()) await notice.locator(".reader-modal-footer button").last().click();
}

export async function chooseFirst(page: Page) {
  await firstChoice(page).click();
  await expect(page.locator(".reader")).toHaveAttribute("aria-busy", "false");
  await dismissNotice(page);
}

/** Follows the first choice until the given page (the opening pages have no checks or fights). */
export async function readTo(page: Page, passageId: string) {
  for (let step = 0; step < 12; step++) {
    if ((await page.locator(".reader-copy").getAttribute("data-passage")) === passageId) return;
    await chooseFirst(page);
  }
  await onPage(page, passageId);
}

/** A page title from the published bundle, so tests follow story edits. */
export async function sceneTitle(page: Page, locale: "en" | "fr", passageId: string) {
  const bundle = await (await page.request.get(`/stories/house/${locale}.json`)).json();
  return bundle.scenes[passageId].title as string;
}

/** Fixture: gives Nour's examination (page "messagere") a handwritten reverse side. */
export async function withExaminationReverse(page: Page, reverse: string) {
  await page.route("**/stories/house/*.json", async (route) => {
    const response = await route.fetch();
    const bundle = await response.json();
    for (const block of bundle.scenes?.messagere?.blocks ?? [])
      if (block.examination) block.examination.reverse = reverse;
    await route.fulfill({ response, json: bundle });
  });
}

/** Opens Orée with instant text and no narration; by default past the three opening pages. */
export async function enterReader(page: Page, { french = false, skipIntro = true } = {}) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/narration**", (route) => route.fulfill({ status: 503, body: "{}" }));
  await page.goto("/");
  if (french) {
    await page.getByRole("button", { name: "Language: English", exact: true }).click();
    await page.getByRole("button", { name: "Français", exact: true }).click();
  }
  await playStory(page, french);
  await expect(page.locator(".reader-copy h1")).toBeVisible();
  await page.getByRole("button", { name: /Reading preferences|Préférences de lecture/ }).click();
  await page
    .getByRole("combobox", { name: french ? "Affichage du texte" : "Text display" })
    .selectOption("instant");
  await page
    .getByRole("checkbox", { name: french ? "Lire à voix haute" : "Read aloud", exact: true })
    .uncheck();
  await page.locator(".reading-sidebar header button").click();
  if (skipIntro) for (let index = 0; index < 3; index++) await next(page);
}

/** Fixed character rolls (all 6) and dice seed, so a fight always ends the same way. */
export async function fixDice(page: Page, seed: number) {
  await page.addInitScript((seed) => {
    crypto.getRandomValues = <T extends ArrayBufferView | null>(values: T) => {
      if (values instanceof Uint8Array) values.fill(251);
      if (values instanceof Uint32Array) values.fill(seed);
      return values;
    };
  }, seed);
}

/** Rolls and confirms an open check, or closes a notice, then waits for the reader. */
export async function settlePage(page: Page) {
  const check = page.locator(".check-roll-modal");
  if (await check.count()) {
    const heading = await page.locator(".reader-copy h1").textContent();
    const roll = check.getByRole("button", { name: /Lancer les|Roll dice/ });
    if (await roll.count()) {
      await expect(check.locator(".dice-result")).toHaveCount(0);
      await roll.click();
      await expect(check.locator(".dice-roll")).toBeVisible();
      await expect(page.locator(".reader-copy h1")).toHaveText(heading!);
    }
    await check.getByRole("button", { name: /Continuer|Continue/, exact: true }).click();
    await expect(check).toHaveCount(0);
  }
  await dismissNotice(page);
  await expect(page.locator(".reader")).toHaveAttribute("aria-busy", "false");
}

/** Takes the first choice and settles what it opens. */
export async function next(page: Page) {
  await firstChoice(page).click();
  await expect(page.locator(".reader")).toHaveAttribute("aria-busy", "false");
  await settlePage(page);
}

/** Follows the first choice until `found` shows (a fight, a check…). */
export async function readUntil(page: Page, found: Locator, steps = 42) {
  // next() settles each page it opens.
  for (let step = 0; step < steps && !(await found.count()); step++) await next(page);
  await expect(found.first()).toBeVisible();
  return found.first();
}

export const reachCombat = (page: Page) => readUntil(page, page.locator(".reader-combat-modal"));

/** Repeats a combat move until the fight's outcome shows. */
export async function fightToEnd(combat: Locator, move = "Basic attack") {
  for (let turn = 0; turn < 30 && !(await combat.locator(".combat-ending-title").count()); turn++) {
    const button = combat.getByRole("button", { name: move, exact: true });
    if (await button.isEnabled({ timeout: 500 }).catch(() => false)) await button.click();
    else await combat.page().waitForTimeout(200);
  }
}

/** How many web animations run on elements inside `selector`. */
export const animationsOn = (page: Page, selector: string) =>
  page.evaluate(
    (selector) =>
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation.effect instanceof KeyframeEffect &&
            animation.effect.target instanceof Element &&
            animation.effect.target.closest(selector),
        ).length,
    selector,
  );
