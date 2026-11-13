import { expect, test } from "./test.ts";
import type { Page } from "@playwright/test";
import { editBundle, enterReader, next, onPage, openOree, readTo } from "./oree.ts";

/** Nour's page: long text and side art. */
async function nour(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openOree(page);
  await readTo(page, "messagere");
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

test("reader keeps a wide cinematic canvas and a centered readable text column", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await nour(page); // a page with right-page artwork
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

test("keeps character size, aligns language chevron, removes close border and preserves text width beside art", async ({
  page,
}) => {
  await enterReader(page);
  const character = page.getByRole("button", { name: /My Character/ });
  const before = (await character.boundingBox())!;
  const font = await character.evaluate((element) => getComputedStyle(element).fontSize);
  await character.hover();
  const after = (await character.boundingBox())!;
  expect(after.width).toBeCloseTo(before.width, 1);
  expect(after.height).toBeCloseTo(before.height, 1);
  await expect(character).toHaveCSS("font-size", font);
  const language = (await page.locator(".reader-toolbar .language-picker summary").boundingBox())!;
  const chevron = (await page.locator(".reader-toolbar .language-chevron").boundingBox())!;
  expect(chevron.y + chevron.height / 2).toBeCloseTo(language.y + language.height / 2, 0);
  await page.getByRole("button", { name: "Reading preferences", exact: true }).click();
  await expect(page.locator(".reading-sidebar header button")).toHaveCSS("border-top-width", "0px");
  await expect(
    page
      .getByRole("combobox", { name: "Narrator", exact: true })
      .locator('option[value^="narrator."]'),
  ).toHaveCount(6);
  await page.locator(".reading-sidebar header button").click();
  const plain = (await page.locator(".reader-copy").boundingBox())!.width;
  await next(page);
  await expect(page.locator(".story-art img").first()).toBeVisible();
  const illustrated = (await page.locator(".reader-copy").boundingBox())!.width;
  expect(illustrated).toBeCloseTo(plain, 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("board effects light the whole viewport, menu included", async ({ page }) => {
  await editBundle(page, (bundle) => {
    bundle.scenes.atelier.events = [
      {
        id: "viewport-test",
        blockId: "page",
        trigger: { kind: "passage" },
        action: {
          kind: "effect",
          effect: { id: "light-flicker", duration: 10000, target: "canvas", intensity: 0.2 },
        },
      },
    ];
  });
  await enterReader(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Replay page", exact: true }).click();
  const effect = page.locator(".reader-viewport-effect");
  await expect(effect).toBeAttached();
  const bounds = (await effect.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(bounds.x).toBeCloseTo(0, 0);
  expect(bounds.width).toBeCloseTo(viewport.width, 0);
  expect(bounds.y).toBeCloseTo(0, 0);
  expect(bounds.height).toBeCloseTo(viewport.height, 0);
  // Painted above the sticky menu, and never in the way of its buttons.
  await expect(effect).toHaveCSS("pointer-events", "none");
  await page.getByRole("button", { name: "Reading preferences", exact: true }).click();
  await expect(page.locator(".reading-sidebar")).toBeVisible();
});
