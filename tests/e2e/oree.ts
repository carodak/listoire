import { expect, type Page } from "@playwright/test";

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
