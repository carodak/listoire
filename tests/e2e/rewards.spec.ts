import { expect, test } from "./test.ts";
import type { Page } from "@playwright/test";
import { onPage, playStory, readTo } from "./oree.ts";

async function acceptLetter(page: Page, french = false) {
  await page.route("**/api/narration**", (route) => route.fulfill({ status: 503, body: "{}" }));
  await page.goto("/");
  if (french) await page.getByRole("button", { name: /^Language/ }).click();
  if (french) await page.getByRole("button", { name: "Français", exact: true }).click();
  await playStory(page, french);
  await readTo(page, "messagere");
  await page
    .locator('.choices button:has-text("letter"), .choices button:has-text("lettre")')
    .click();
  await onPage(page, "preuve"); // the story goes on: no window to close
}

const box = async (page: Page, selector: string) => (await page.locator(selector).boundingBox())!;
const overlaps = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test("an item shows a compact notification at the far right, beside the text", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await acceptLetter(page);
  const stack = page.getByRole("status", { name: "Rewards" });
  const card = stack.locator(".reward-card");
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("The letter from Orée");
  await expect(card).toContainText("Item received");
  const position = await box(page, ".reward-card");
  const toolbar = await box(page, ".reader-toolbar");
  expect(position.x + position.width).toBeGreaterThan(1440 - 24);
  expect(position.y).toBeGreaterThanOrEqual(toolbar.y + toolbar.height);
  expect(overlaps(position, await box(page, ".reader-copy"))).toBe(false);
  // Hover pauses the 10 s timer; the end of the timer dismisses the card.
  await card.hover();
  await expect
    .poll(() => card.locator(".reward-timer").evaluate((bar) => bar.getAnimations()[0]?.playState))
    .toBe("paused");
  await page.mouse.move(0, 0);
  await card.locator(".reward-timer").evaluate((bar) => {
    const [timer] = bar.getAnimations();
    timer!.currentTime = 10000;
  });
  await expect(card).toHaveCount(0);
});

for (const viewport of [
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
])
  test(`at ${viewport.width}px the notification sits over the toolbar title, not the text`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await acceptLetter(page);
    const card = page.locator(".reward-card");
    await expect(card).toBeVisible();
    const position = await box(page, ".reward-card");
    const toolbar = await box(page, ".reader-toolbar");
    expect(position.y + position.height).toBeLessThanOrEqual(toolbar.y + toolbar.height);
    expect(overlaps(position, await box(page, ".reader-copy"))).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    await card.getByRole("button", { name: "Dismiss" }).click();
    await expect(card).toHaveCount(0);
  });

test("on a page with art on the right, a 1440px screen keeps the card off the art", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  // Fixture: page "preuve" (after the letter) gets Nour's side illustration.
  await page.route("**/stories/house/en.json", async (route) => {
    const response = await route.fetch();
    const bundle = await response.json();
    const art = bundle.scenes.messagere.blocks.find(
      (block: { kind: string }) => block.kind === "media",
    );
    bundle.scenes.preuve.blocks.splice(1, 0, { ...art, id: "preuve.art", examination: undefined });
    await route.fulfill({ response, json: bundle });
  });
  await acceptLetter(page);
  await expect(page.locator(".media-right")).toBeVisible();
  const position = await box(page, ".reward-card");
  expect(overlaps(position, await box(page, ".reader-copy"))).toBe(false);
  expect(overlaps(position, await box(page, ".media-right"))).toBe(false);
});

test("rewards are translated and still under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await acceptLetter(page, true);
  const card = page.getByRole("status", { name: "Récompenses" }).locator(".reward-card");
  await expect(card).toContainText("Objet reçu");
  const animations = await card.evaluate((element) =>
    element
      .getAnimations({ subtree: true })
      .map((animation) => (animation as CSSAnimation).animationName),
  );
  expect(animations).toEqual(["reward-hold"]);
  await expect(card.getByRole("button", { name: "Fermer" })).toBeVisible();
});
