import { expect, test } from "./test.ts";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Play an existing story" }).click();
});

test("reading preferences take focus, close on Escape and return focus to their button", async ({
  page,
}) => {
  const opener = page.getByRole("button", { name: "Reading preferences" });
  await opener.click();
  const panel = page.getByRole("complementary", { name: "Reading preferences" });
  await expect(panel).toBeFocused();
  await panel.getByRole("button", { name: "Close", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(opener).toBeFocused();
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

test("both side panels share one close control", async ({ page }) => {
  await page.getByRole("button", { name: "Reading preferences" }).click();
  await page
    .getByRole("complementary", { name: "Reading preferences" })
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page.getByRole("button", { name: /My Character/ }).click();
  await page
    .getByRole("complementary", { name: "My Character" })
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await expect(page.locator(".reader-sidebar")).toHaveCount(0);
});
