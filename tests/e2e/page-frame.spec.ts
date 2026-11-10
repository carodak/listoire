import { expect, test } from "./test.ts";
import type { Page } from "@playwright/test";
import { onPage, playStory, readTo } from "./oree.ts";

async function nour(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/narration**", (route) => route.fulfill({ status: 503, body: "{}" }));
  await page.goto("/");
  await playStory(page);
  await readTo(page, "messagere"); // long text and Nour's side art
  return page.getByRole("region", { name: "Story text" });
}

const scrollTop = (board: ReturnType<Page["getByRole"]>) =>
  board.evaluate((element) => element.scrollTop);

test("only the text scrolls: the menu, the page and the side art stay", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  const board = await nour(page);
  const art = page.locator(".media-right");
  const before = (await art.boundingBox())!;
  await page.mouse.move(400, 400);
  await page.mouse.wheel(0, 500);
  await expect.poll(() => scrollTop(board)).toBeGreaterThan(100);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  expect((await page.locator(".reader-toolbar").boundingBox())!.y).toBe(0);
  expect((await art.boundingBox())!.y).toBeCloseTo(before.y, -1);
  // One scrollbar (the text's), no page scroll, no sideways scroll.
  expect(
    await page.evaluate(() => [
      document.documentElement.scrollHeight - innerHeight,
      document.documentElement.scrollWidth - innerWidth,
    ]),
  ).toEqual([0, 0]);
});

test("a new page and Back start at the top; keys scroll the text without a click", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  const board = await nour(page);
  // Focus is on the page heading, inside the text: Page Down scrolls it.
  await expect(page.locator(".reader-copy h1")).toBeFocused();
  await page.keyboard.press("PageDown");
  await expect.poll(() => scrollTop(board)).toBeGreaterThan(100);
  await page.keyboard.press("Home");
  await expect.poll(() => scrollTop(board)).toBe(0);
  // After a toolbar click the keys still scroll the text.
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.keyboard.press("End");
  await expect.poll(() => scrollTop(board)).toBeGreaterThan(100);
  await page.locator(".choices button").first().click();
  await onPage(page, "preuve");
  expect(await scrollTop(board)).toBe(0);
  await page.mouse.move(400, 400);
  await page.mouse.wheel(0, 400);
  await page.getByRole("button", { name: "Previous page", exact: true }).click();
  await onPage(page, "messagere");
  expect(await scrollTop(board)).toBe(0);
});

for (const width of [1024, 320])
  test(`no sideways scroll and a single scroll area at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    await nour(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  });
