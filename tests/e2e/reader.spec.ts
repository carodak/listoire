import { expect, test } from "./test.ts";
import type { Page } from "@playwright/test";
import { chooseFirst, firstChoice, onPage, readTo, sceneTitle } from "./oree.ts";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});
async function enterStory(page: Page) {
  await page.getByRole("button", { name: /Play an existing story|Jouer/ }).click();
}

async function chooseLanguage(page: Page, language: "en" | "fr") {
  await page.getByRole("button", { name: /^(Language|Langue):/ }).click();
  await page
    .getByRole("button", { name: language === "en" ? "English" : "Français", exact: true })
    .click();
}

test("an unavailable translation keeps its available story and save while localizing the interface", async ({
  page,
}) => {
  await page.route("**/stories/house/manifest.json", (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        storyId: "house",
        defaultLocale: "en",
        locales: ["en"],
      },
    }),
  );
  const requestedFrench: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/fr.json")) requestedFrench.push(request.url());
  });
  await page.goto("/");
  await enterStory(page);
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
  await enterStory(page);
  await onPage(page, "etabli");
  await expect(page.locator(".reader-copy h1")).toHaveText(await sceneTitle(page, "en", "etabli"));
  expect(requestedFrench).toEqual([]);
});

test("recovers from unavailable browser storage without losing the first passage", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = IDBFactory.prototype.open;
    Object.assign(window, {
      restoreDatabase: () => {
        IDBFactory.prototype.open = original;
      },
    });
    IDBFactory.prototype.open = () => {
      throw new DOMException("Unavailable", "SecurityError");
    };
  });
  await page.goto("/");
  await enterStory(page);
  await expect(page.getByRole("alert")).toContainText("could not be saved");
  await page.evaluate(() =>
    (window as unknown as { restoreDatabase: () => void }).restoreDatabase(),
  );
  await page.getByRole("button", { name: "Reload your saved place" }).click();
  await expect(firstChoice(page)).toBeVisible();
  await firstChoice(page).click();
  await onPage(page, "etabli");
});

test("chooses, reloads the resolved passage, downloads and explicitly restarts", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await enterStory(page);
  await onPage(page, "matin-ville");
  await expect(firstChoice(page)).toBeVisible();
  if (["chromium", "mobile"].includes(testInfo.project.name)) {
    await page.screenshot({ path: testInfo.outputPath("opening.png"), fullPage: true });
  }
  await firstChoice(page).click();
  await onPage(page, "etabli");
  await page.reload();
  await enterStory(page);
  await onPage(page, "etabli");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download saved progress" }).click();
  expect((await download).suggestedFilename()).toBe("listoire-house-en.json");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Read from the beginning" }).click();
  await onPage(page, "etabli");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Read from the beginning" }).click();
  await onPage(page, "matin-ville");
  await expect(firstChoice(page)).toBeVisible();
  expect(errors).toEqual([]);
});

test("Back still works after a reload, through the saved previous pages", async ({ page }) => {
  await page.goto("/");
  await enterStory(page);
  await onPage(page, "matin-ville");
  await chooseFirst(page);
  await onPage(page, "etabli");
  await chooseFirst(page);
  const third = await page.locator(".reader-copy").getAttribute("data-passage");
  expect(third).not.toBe("etabli");
  await page.reload();
  await enterStory(page);
  await onPage(page, third!);
  const back = page.getByRole("button", { name: "Previous page", exact: true });
  await expect(back).toBeEnabled();
  await back.click();
  await onPage(page, "etabli");
  await back.click();
  await onPage(page, "matin-ville");
  await expect(back).toBeDisabled();
});

test("unifies language selection while preserving each localized save", async ({ page }) => {
  await page.goto("/");
  await enterStory(page);
  await firstChoice(page).click();
  await onPage(page, "etabli");
  await chooseLanguage(page, "fr");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await onPage(page, "matin-ville"); // the French save starts on its own
  await firstChoice(page).click();
  const french = await sceneTitle(page, "fr", "etabli");
  await expect(page.locator(".reader-copy h1")).toHaveText(french);
  await page.reload();
  await enterStory(page);
  await expect(page.locator(".reader-copy h1")).toHaveText(french);
  await chooseLanguage(page, "en");
  await onPage(page, "etabli");
  await expect(page.locator(".reader-copy h1")).toHaveText(await sceneTitle(page, "en", "etabli"));
  // The story's own page color (#f5ead7) on the reader; the site keeps its background.
  await expect(page.locator(".reader")).toHaveCSS("background-color", "rgb(245, 234, 215)");
  await expect(page.locator("html")).toHaveCSS("background-color", "rgb(245, 245, 245)");
});

test("recovers from unavailable story data and supports keyboard and narrow layouts", async ({
  page,
}) => {
  await page.route("**/stories/house/en.json", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("/");
  await enterStory(page);
  await expect(page.getByRole("alert")).toContainText("could not be opened");
  await page.unroute("**/stories/house/en.json");
  await page.getByRole("button", { name: "Reload your saved place" }).click();
  const choice = firstChoice(page);
  await expect(choice).toBeVisible();
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await choice.focus();
  await page.keyboard.press("Enter");
  await onPage(page, "etabli");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
});

test("preserves an incompatible save and offers a recovery download", async ({ page }) => {
  await page.goto("/");
  await enterStory(page);
  await expect(firstChoice(page)).toBeVisible();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("listoire");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("records", "readwrite");
      const store = transaction.objectStore("records");
      // Saves are keyed by checkpoint and locale (save:<checkpoint>:en).
      const keys = store.getAllKeys();
      keys.onsuccess = () => {
        const key = keys.result.find((key) => /^save:.+:en$/.test(String(key)))!;
        const get = store.get(key);
        get.onsuccess = () => store.put({ ...get.result, release: "old-release" }, key);
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
  await page.reload();
  await enterStory(page);
  await expect(page.getByRole("alert")).toContainText("another story version");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download saved progress" }).click();
  await download;
  await page.reload();
  await enterStory(page);
  await expect(page.getByRole("alert")).toContainText("another story version");
});

test("reader keeps a wide cinematic canvas and a centered readable text column", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await enterStory(page);
  await readTo(page, "messagere"); // a page with right-page artwork
  const toolbar = (await page.locator(".reader-toolbar").boundingBox())!;
  // Pass 7: the board scrolls and spans the window; the canvas is its content box.
  const board = page.locator(".reader-board");
  const inner = await board.evaluate((element) =>
    parseFloat(getComputedStyle(element).paddingLeft),
  );
  const box = (await board.boundingBox())!;
  const canvas = { ...box, width: box.width - 2 * inner };
  expect(toolbar.y).toBeLessThan(25);
  expect(canvas.y).toBeGreaterThanOrEqual(toolbar.y + toolbar.height - 1);
  const hero = (await page.locator(".story-scene-heading").boundingBox())!;
  const heading = (await page.locator(".reader-copy h1").boundingBox())!;
  expect(hero.height).toBeLessThan(200);
  expect(heading.y).toBeGreaterThanOrEqual(hero.y);
  expect(heading.y + heading.height).toBeLessThan(hero.y + hero.height);
  const art = page.locator('.story-art [data-block="messagere.illustration"] img').first();
  await expect
    .poll(() => art.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  const prose = (await page.locator(".prose > p").first().boundingBox())!;
  expect(canvas.width / 1440).toBeGreaterThanOrEqual(0.9);
  expect(canvas.width / 1440).toBeLessThanOrEqual(0.95);
  // A readable measure: a large share of the canvas, but never wider than 800px.
  expect(prose.width).toBeGreaterThan(canvas.width * 0.4);
  expect(prose.width).toBeLessThanOrEqual(800);
  expect((await page.locator(".story-art").boundingBox())!.x).toBeGreaterThan(
    prose.x + prose.width - 80,
  );
  expect(prose.x).toBeCloseTo((await page.locator(".reader-copy").boundingBox())!.x, 0);
  expect(toolbar.height).toBeLessThanOrEqual(72);
});

test("right-page artwork changes with the story and returns on Back and Replay", async ({
  page,
}) => {
  await page.goto("/");
  await enterStory(page);
  await readTo(page, "messagere");
  const artwork = page.locator('.story-art [data-block="messagere.illustration"]');
  await expect(artwork).toBeVisible();
  await chooseFirst(page);
  await onPage(page, "preuve");
  await expect(artwork).toHaveCount(0);
  await page.getByRole("button", { name: "Previous page", exact: true }).click();
  await onPage(page, "messagere");
  await expect(artwork).toBeVisible();
  await page.getByRole("button", { name: "Replay page", exact: true }).click();
  await expect(artwork).toBeVisible();
  await expect(artwork).toHaveCount(1);
});
test("resetting a paused story resumes a clean first page and allows reading again", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await enterStory(page);
  await firstChoice(page).click();
  await onPage(page, "etabli");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Read from the beginning", exact: true }).click();
  await onPage(page, "matin-ville");
  await expect(page.locator('[data-segment="matin-ville.p1"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toHaveCount(0);
  await firstChoice(page).click();
  await onPage(page, "etabli");
  expect(errors).toEqual([]);
});
