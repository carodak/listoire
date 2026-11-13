import { expect, test } from "./test.ts";
import { chooseFirst, openOree, playStory, readTo } from "./oree.ts";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openOree(page);
});

// Two tests: browser coverage keeps only the scripts of the page loaded last.
test("character details: inventory tabs from the keyboard, and notes kept apart from the story", async ({
  page,
}) => {
  await page.getByRole("button", { name: "My Character", exact: true }).click();
  await expect(page.locator(".character-stats")).toContainText("6/6");
  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  await page.getByRole("tab", { name: "Equipment", exact: true }).click();
  await page.getByRole("tab", { name: "Equipment", exact: true }).press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Consumables", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("Escape");
  // Notes are the reader's own: saved on request, a discarded change asks first.
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  const notes = page.getByRole("dialog", { name: "Notes", exact: true });
  await notes.getByLabel("Your notes", { exact: true }).fill("Keep the address for tomorrow.");
  await notes.getByRole("button", { name: "Save", exact: true }).click();
  await expect(notes.getByRole("status")).toHaveText("Notes saved.");
  await notes.getByLabel("Your notes", { exact: true }).fill("An unsaved replacement");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.keyboard.press("Escape");
  await expect(notes).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await expect(notes.getByLabel("Your notes", { exact: true })).toHaveValue(
    "Keep the address for tomorrow.",
  );
});

test("character: starts collapsed, reveals only known encounters, kept after reload", async ({
  page,
  isMobile,
}) => {
  const tab = page.getByRole("button", { name: /My Character/ });
  await expect(tab).toHaveAttribute("aria-expanded", "false");
  await tab.click();
  await expect(page.locator(".character-stats")).toContainText("6/6");
  // "Health" carries a decorative heart (aria-hidden) before its name.
  await expect(page.locator(".character-stats dt")).toHaveText([/Health$/, "STR", "DEX", "WIL"]);
  const stats = await page.locator(".character-stats").innerText();
  await page.getByRole("button", { name: /Abilities/ }).click();
  await expect(page.getByRole("dialog", { name: "Abilities", exact: true })).toContainText(
    "Rank 1",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Encounters/ }).click();
  const encounters = page.getByRole("dialog", { name: "Encounters", exact: true });
  await expect(encounters).toContainText("No one encountered yet.");
  await expect(encounters).not.toContainText("Nour");
  await page.keyboard.press("Escape");
  // On a phone the panel covers the page: close it to read on, as a reader would. On a wider
  // screen it sits beside the text and stays open from page to page.
  if (isMobile) await page.keyboard.press("Escape");
  await chooseFirst(page);
  if (!isMobile) await expect(tab).toHaveAttribute("aria-expanded", "true");
  await readTo(page, "messagere"); // Nour delivers the letter
  if (isMobile) await tab.click();
  await page.getByRole("button", { name: /Encounters/ }).click();
  await expect(encounters).toContainText("Nour");
  await expect(encounters.getByRole("heading", { name: "Nour", exact: true })).toBeVisible();
  await expect(encounters.getByText(/Former courier/)).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await playStory(page);
  await tab.click();
  expect(await page.locator(".character-stats").innerText()).toBe(stats);
});

test("keeps unsaved notes available to copy when storage rejects a write", async ({ page }) => {
  await page.getByRole("button", { name: "My Character", exact: true }).click();
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  const notes = page.getByRole("dialog", { name: "Notes", exact: true });
  await notes.getByLabel("Your notes", { exact: true }).fill("Do not lose this text.");
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (String(key).startsWith("notes:")) throw new DOMException("Full", "QuotaExceededError");
      return put.call(this, value, key);
    };
  });
  await notes.getByRole("button", { name: "Save", exact: true }).click();
  await expect(notes.getByRole("alert")).toContainText("Notes could not be saved");
  await expect(notes.getByLabel("Your notes", { exact: true })).toHaveValue(
    "Do not lose this text.",
  );
});

test("the character panel closes on Escape from inside, but not while a nested modal is open", async ({
  page,
}) => {
  const opener = page.getByRole("button", { name: /My Character/ });
  await opener.click();
  const panel = page.getByRole("complementary", { name: "My Character" });
  await expect(panel).toBeFocused();
  await panel.getByRole("button", { name: /Abilities/ }).click();
  const abilities = page.getByRole("dialog", { name: "Abilities", exact: true });
  await expect(abilities).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(abilities).toHaveCount(0);
  await expect(panel).toBeVisible();
  await panel.getByRole("button", { name: /Abilities/ }).focus();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("the character portrait follows the page colour live, like the illustrations", async ({
  page,
}) => {
  await page.getByRole("button", { name: /My Character/ }).click();
  const portrait = page.locator(".character-portrait");
  await expect(portrait).toHaveJSProperty("complete", true);
  // Resolved through the presentation session, not a hand-built URL.
  await expect(portrait).toHaveAttribute("src", /\/stories\/house\/media\/.+\.webp$/);
  await expect(portrait).toHaveCSS("mix-blend-mode", "multiply");
  await expect(portrait).toHaveCSS("filter", "none");
  const preferences = page.getByRole("button", { name: "Reading preferences", exact: true });
  await preferences.click();
  await page.getByRole("button", { name: "Page color #222b31", exact: true }).click();
  await page.getByRole("button", { name: /My Character/ }).click(); // closes preferences
  await expect(portrait).toHaveCSS("mix-blend-mode", "screen");
  await expect(portrait).toHaveCSS("filter", "invert(1)");
  await preferences.click();
  await page.getByRole("button", { name: "Page color #f5ead7", exact: true }).click();
  await page.getByRole("button", { name: /My Character/ }).click();
  await expect(portrait).toHaveCSS("mix-blend-mode", "multiply");
});
