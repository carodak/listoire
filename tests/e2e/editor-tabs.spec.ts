import { expect, test } from "./test.ts";
import type { Locator, Page } from "@playwright/test";

async function expectTabPattern(page: Page, tablist: Locator) {
  const tabs = tablist.getByRole("tab");
  const first = tabs.first();
  await first.click();
  await expect(first).toHaveAttribute("aria-selected", "true");
  await expect(first).toHaveAttribute("tabindex", "0");
  await expect(tabs.nth(1)).toHaveAttribute("tabindex", "-1");
  const panelId = (await first.getAttribute("aria-controls"))!;
  await expect(page.locator(`#${panelId}`)).toHaveAttribute("role", "tabpanel");
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(`#${panelId}`)).toHaveAttribute(
    "aria-labelledby",
    (await tabs.nth(1).getAttribute("id"))!,
  );
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(tabs.last()).toBeFocused();
  await expect(tabs.last()).toHaveAttribute("aria-selected", "true");
}

test("ribbon and project tabs follow the ARIA tab pattern with arrow keys", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByRole("tablist", { name: "Ribbon categories" })).toBeVisible({
    timeout: 20000,
  });
  await expectTabPattern(page, page.getByRole("tablist", { name: "Ribbon categories" }));
  await expectTabPattern(page, page.getByRole("tablist", { name: "Project panels" }));
});

test("the editor opens on the story's first passage", async ({ page }) => {
  await page.goto("/editor");
  await expect(
    page.getByRole("button", { name: "Preview from matin-ville", exact: true }),
  ).toBeVisible({ timeout: 20000 });
});
