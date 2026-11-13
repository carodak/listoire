import { expect, type Locator, type Page } from "@playwright/test";
import { caretTo } from "./editor.ts";

/** Helpers for the editor's Image dialog, on Orée. */

export const character = "sketch.curly-haired-woman-standing-001";
export const misty = "sketch.misty-conifer-plain-001";
export const fern = "sketch.fern-fronds-001";

/** Opens Add Image on an existing page ("chemin"), from that page's text, as an author would. */
export async function openNewImage(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/editor");
  await expect(page.locator(".preview-slot .prose")).toBeVisible({ timeout: 20_000 });
  await caretTo(page, "=== chemin ===", 1);
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  await page.getByRole("button", { name: "Image", exact: true }).click();
  return page.getByRole("dialog", { name: "Add Image", exact: true });
}

export const plane = (dialog: Locator, image: string) =>
  dialog.locator(`.multiplane-plane[data-image="${image}"]`);

export const layerStyle = (target: Locator, name: string) =>
  target.locator("img").evaluate((image, key) => image.style.getPropertyValue(key), name);

/** Opens the start area's ready-made scenes (Pass 11: a toggle) and applies one. */
export async function readyMade(dialog: Locator, scene: string) {
  await dialog.getByRole("button", { name: "Ready-made scenes", exact: true }).click();
  await dialog.getByRole("button", { name: scene, exact: true }).click();
}

/** Opens (or closes) a folded settings section by its title. */
export async function openSection(dialog: Locator, title: string) {
  await dialog
    .locator(".image-section > summary")
    .filter({ hasText: new RegExp(`^${title}( ·|$)`) })
    .click();
}

/** Searches the open picker and clicks that image: one click. */
export async function pick(dialog: Locator, picker: string, image: string) {
  const list = dialog.getByRole("region", { name: picker, exact: true });
  await list.getByLabel("Search pictures", { exact: true }).fill(image);
  await list.locator(`button[data-asset="${image}"]`).click();
  await expect(list).toHaveCount(0);
}

/** Selects the picture at a depth ("Middleground"…) in the layers panel. */
export const selectAtDepth = (dialog: Locator, depth: string) =>
  dialog.getByRole("group", { name: depth, exact: true }).locator(".image-picture").click();
