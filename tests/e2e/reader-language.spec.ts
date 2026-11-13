import { expect, test } from "./test.ts";
import type { Page } from "@playwright/test";
import {
  chooseFirst,
  chooseLanguage,
  firstChoice,
  onPage,
  openOree,
  playStory,
  readTo,
  sceneTitle,
} from "./oree.ts";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

async function openInventory(page: Page, french = false) {
  await page.getByRole("button", { name: french ? /Mon personnage/ : /My Character/ }).click();
  await page.getByRole("button", { name: french ? /Inventaire/ : /Inventory/ }).click();
  return page.getByRole("dialog", { name: french ? "Inventaire" : "Inventory", exact: true });
}
/** Closes the inventory, then the character panel. */
async function closeInventory(page: Page) {
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
}

test("an unavailable translation keeps its available story and save while localizing the interface", async ({
  page,
}) => {
  await page.route("**/stories/house/manifest.json", (route) =>
    route.fulfill({
      json: { schemaVersion: 1, storyId: "house", defaultLocale: "en", locales: ["en"] },
    }),
  );
  const requestedFrench: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/fr.json")) requestedFrench.push(request.url());
  });
  await openOree(page);
  await firstChoice(page).click();
  await onPage(page, "etabli");
  await chooseLanguage(page, "fr");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator(".language-note")).toContainText(
    "Cette histoire est disponible en anglais",
  );
  await expect(page.locator(".reader-copy h1")).toHaveText(await sceneTitle(page, "en", "etabli"));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Entrez dans l’histoire." })).toBeVisible();
  await playStory(page, true);
  await onPage(page, "etabli");
  await expect(page.locator(".reader-copy h1")).toHaveText(await sceneTitle(page, "en", "etabli"));
  expect(requestedFrench).toEqual([]);
});

test("English and French keep separate progress, inventory, artwork treatment and reloads", async ({
  page,
}) => {
  await openOree(page);
  await readTo(page, "messagere");
  const illustration = page.locator('[data-block="messagere.illustration"] img').first();
  await expect(illustration).toHaveCSS("filter", "none");
  await expect(illustration).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await chooseFirst(page); // accept the letter (item notice)
  await readTo(page, "lettre");
  await expect(await openInventory(page)).toContainText("The letter from Orée");
  await closeInventory(page);
  await chooseLanguage(page, "fr");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await onPage(page, "matin-ville"); // the French save starts on its own
  await expect(await openInventory(page, true)).not.toContainText("La lettre d'Orée");
  await closeInventory(page);
  await firstChoice(page).click();
  await expect(page.locator(".reader-copy h1")).toHaveText(await sceneTitle(page, "fr", "etabli"));
  await readTo(page, "lettre");
  await expect(await openInventory(page, true)).toContainText("La lettre d'Orée");
  await closeInventory(page);
  const french = await sceneTitle(page, "fr", "lettre");
  await page.reload();
  await playStory(page, true);
  await expect(page.locator(".reader-copy h1")).toHaveText(french);
  await chooseLanguage(page, "en");
  await onPage(page, "lettre");
  await expect(page.locator(".reader-copy h1")).toHaveText(await sceneTitle(page, "en", "lettre"));
  // The story's own page color (#f5ead7) on the reader; the site keeps its background.
  await expect(page.locator(".reader")).toHaveCSS("background-color", "rgb(245, 234, 215)");
  await expect(page.locator("html")).toHaveCSS("background-color", "rgb(245, 245, 245)");
});
