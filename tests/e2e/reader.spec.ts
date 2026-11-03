import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

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
  await page.getByRole("button", { name: "Continue reading" }).click();
  await expect(page.locator(".prose")).toContainText(/On the back/);
  await chooseLanguage(page, "fr");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator(".language-note")).toContainText(
    "Cette histoire est disponible en anglais",
  );
  await expect(page.locator(".prose")).toContainText(/On the back/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Entrez dans l’histoire." })).toBeVisible();
  await enterStory(page);
  await expect(page.locator(".prose")).toContainText(/On the back/);
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
  await expect(page.getByRole("button", { name: "Continue reading" })).toBeVisible();
  await page.getByRole("button", { name: "Continue reading" }).click();
  await expect(page.locator(".prose")).toContainText(/On the back/);
});

test("chooses, reloads the resolved passage, downloads and explicitly restarts", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await enterStory(page);
  await expect(page.getByRole("button", { name: "Continue reading" })).toBeVisible();
  if (["chromium", "mobile"].includes(testInfo.project.name)) {
    await page.screenshot({ path: testInfo.outputPath("opening.png"), fullPage: true });
  }
  await page.getByRole("button", { name: "Continue reading" }).click();
  await expect(page.locator(".prose")).toContainText(/On the back/);
  await page.reload();
  await enterStory(page);
  await expect(page.locator(".prose")).toContainText(/On the back/);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download saved progress" }).click();
  expect((await download).suggestedFilename()).toBe("listoire-house-en.json");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Read from the beginning" }).click();
  await expect(page.locator(".prose")).toContainText(/On the back/);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Read from the beginning" }).click();
  await expect(page.getByRole("button", { name: "Continue reading" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("unifies language selection while preserving each localized save", async ({ page }) => {
  await page.goto("/");
  await enterStory(page);
  await page.getByRole("button", { name: "Continue reading" }).click();
  await expect(page.locator(".prose")).toContainText(/On the back/);
  await chooseLanguage(page, "fr");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await page.getByRole("button", { name: "Continuer la lecture", exact: true }).click();
  await expect(page.locator(".prose")).toContainText(/Au dos/);
  await page.reload();
  await enterStory(page);
  await expect(page.locator(".prose")).toContainText(/Au dos/);
  await chooseLanguage(page, "en");
  await expect(page.locator(".prose")).toContainText(/On the back/);
  await expect(page.locator(".reader")).toHaveCSS("background-color", "rgb(255, 255, 255)");
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
  const choice = page.getByRole("button", { name: "Continue reading" });
  await expect(choice).toBeVisible();
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await choice.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".prose")).toContainText(/On the back/);
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
});

test("preserves an incompatible save and offers a recovery download", async ({ page }) => {
  await page.goto("/");
  await enterStory(page);
  await expect(page.getByRole("button", { name: "Continue reading" })).toBeVisible();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("listoire");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("records", "readwrite");
      const store = transaction.objectStore("records");
      const get = store.get("save:house:en");
      get.onsuccess = () => store.put({ ...get.result, release: "old-release" }, "save:house:en");
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
  await expect(page.locator(".eyebrow")).toHaveText("Chapter One");
  await expect(page.locator(".reader-shell .site-header")).toBeVisible();
  const shell = await page.locator(".reader-shell").boundingBox();
  const header = await page.locator(".site-header").boundingBox();
  const heading = await page.locator(".reader h1").boundingBox();
  expect(shell!.y).toBeLessThan(25);
  expect(header!.y).toBeGreaterThan(shell!.y);
  expect(heading!.y).toBeLessThan(155);
  const canvas = await page.locator(".reader").boundingBox();
  const prose = await page.locator(".prose").boundingBox();
  expect(canvas!.width / 1440).toBeGreaterThanOrEqual(0.9);
  expect(canvas!.width / 1440).toBeLessThanOrEqual(0.95);
  expect(prose!.width).toBeCloseTo(800, 0);
  expect(prose!.x + prose!.width / 2).toBeCloseTo(720, 0);
  expect((await page.locator(".site-header").boundingBox())!.height).toBeLessThan(70);
});
