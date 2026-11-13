import { expect, test } from "./test.ts";
import { readKeys } from "./idb.ts";
import { chooseFirst, firstChoice, onPage, openOree, playStory } from "./oree.ts";

test("text display: instant by default; progressive text waits for Show all text; preferences persist", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openOree(page);
  await onPage(page, "matin-ville");
  // Text is complete on arrival by default.
  await expect(page.locator(".prose")).toContainText("You will have to remember.");
  const reveal = page.getByRole("button", { name: "Show all text", exact: true });
  await expect(reveal).toHaveCount(0);
  const preferences = page.getByRole("button", { name: "Reading preferences", exact: true });
  await preferences.click();
  await expect(page.getByLabel("Text display", { exact: true })).toHaveValue("instant");
  await page.getByLabel("Text display", { exact: true }).selectOption("progressive");
  await preferences.click();
  await page.getByRole("button", { name: "Replay page", exact: true }).click();
  // No choices, and the text reaches its media first.
  await expect(page.locator(".choices")).toHaveCount(0);
  await expect(page.locator(".prose .narrative-media")).toHaveCount(0);
  // Show all text works from the keyboard and completes the page.
  await reveal.focus();
  await page.keyboard.press("Enter");
  await expect(reveal).toHaveCount(0);
  const picture = page.locator('.prose [data-block="matin-ville.illustration"]');
  await expect(picture).toBeVisible();
  const paragraph = await page.locator('[data-segment="matin-ville.p1"]').boundingBox();
  expect((await picture.boundingBox())!.y).toBeGreaterThan(paragraph!.y + paragraph!.height);
  await expect(firstChoice(page)).toBeEnabled();
  // The compact toolbar follows scrolling.
  const character = page.getByRole("button", { name: /My Character/ });
  expect((await character.boundingBox())!.x).toBeGreaterThan((await preferences.boundingBox())!.x);
  await page.evaluate(() => scrollTo(0, 350));
  await expect(preferences).toBeInViewport();
  await expect(character).toBeInViewport();
  expect((await page.locator(".reader-toolbar").boundingBox())!.y).toBeLessThan(5);
  // Page colour and text preferences apply at once and survive a reload.
  await preferences.click();
  await page.getByRole("button", { name: "Page color #faf8f2", exact: true }).click();
  await expect(page.locator(".reader")).toHaveCSS("background-color", "rgb(250, 248, 242)");
  // Larger than medium on every layout (phones use smaller sizes than computers).
  const size = () =>
    page.locator(".prose").evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
  const medium = await size();
  await page.getByLabel("Text size", { exact: true }).selectOption("large");
  await page.getByLabel("Typeface", { exact: true }).selectOption("sans");
  await page.getByLabel("Line spacing", { exact: true }).selectOption("spacious");
  await page.getByLabel("Text display", { exact: true }).selectOption("instant");
  await expect.poll(size).toBeGreaterThan(medium);
  await preferences.click();
  await chooseFirst(page);
  await onPage(page, "etabli");
  await expect(firstChoice(page)).toBeEnabled();
  await page.reload();
  await playStory(page);
  await expect(page.locator(".reader")).toHaveClass(/font-sans text-large lines-spacious/);
  await expect(page.locator(".reader")).toHaveCSS("background-color", "rgb(250, 248, 242)");
  await expect(reveal).toHaveCount(0);
});

test("side panels take focus, close on Escape or their shared Close, and return focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openOree(page);
  const opener = page.getByRole("button", { name: "Reading preferences" });
  await opener.click();
  const panel = page.getByRole("complementary", { name: "Reading preferences" });
  await expect(panel).toBeFocused();
  await panel.getByRole("button", { name: "Close", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(opener).toBeFocused();
  // Both side panels share one close control.
  await opener.click();
  await panel.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: /My Character/ }).click();
  await page
    .getByRole("complementary", { name: "My Character" })
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await expect(page.locator(".reader-sidebar")).toHaveCount(0);
});

test("dragging a volume slider applies every step but stores only the latest", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    (window as unknown as { settingsWrites: number }).settingsWrites = 0;
    IDBObjectStore.prototype.put = function (value, key) {
      if (key === "reader-settings")
        (window as unknown as { settingsWrites: number }).settingsWrites++;
      return put.call(this, value, key);
    };
  });
  await openOree(page);
  await page.getByRole("button", { name: "Reading preferences" }).click();
  const slider = page.getByLabel("Master volume", { exact: true });
  // A fast drag: twenty input events before any write can finish.
  await slider.evaluate((input: HTMLInputElement) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    for (let step = 19; step >= 0; step--) {
      set.call(input, String(step / 20));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
  await expect(slider).toHaveValue("0");
  const stored = async () => {
    const [settings] = (await readKeys(page, "reader", ["reader-settings"])) as [
      { reading?: { masterVolume?: number } } | undefined,
    ];
    return settings?.reading?.masterVolume;
  };
  await expect.poll(stored).toBe(0);
  expect(
    await page.evaluate(() => (window as unknown as { settingsWrites: number }).settingsWrites),
  ).toBeLessThanOrEqual(2);
  await page.reload();
  await playStory(page);
  await page.getByRole("button", { name: "Reading preferences" }).click();
  await expect(page.getByLabel("Master volume", { exact: true })).toHaveValue("0");
});

test("samples artwork pixels and ignores toolbar clicks while the paper eyedropper is active", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openOree(page);
  await page.getByRole("button", { name: "Reading preferences", exact: true }).click();
  const image = page.locator("#sample-color-fixture");
  await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 2;
    const draw = canvas.getContext("2d")!;
    draw.fillStyle = "#336699";
    draw.fillRect(0, 0, 2, 2);
    const image = document.createElement("img");
    image.id = "sample-color-fixture";
    image.src = canvas.toDataURL();
    image.style.cssText =
      "position:fixed;left:40px;bottom:40px;width:80px;height:80px;object-fit:contain;z-index:100";
    document.querySelector(".reader")!.append(image);
  });
  await expect(image).toBeVisible();
  await page.getByRole("button", { name: "Pick a color from the page", exact: true }).click();
  await image.click();
  await expect(page.locator(".reader")).toHaveCSS("background-color", "rgb(51, 102, 153)");
  await image.evaluate((element) => {
    const backdrop = document.createElement("div");
    backdrop.id = "sample-backdrop";
    backdrop.style.cssText =
      "position:fixed;left:40px;bottom:140px;width:80px;height:80px;background:rgb(204,68,0);z-index:100";
    backdrop.innerHTML = '<span style="display:block;width:100%;height:100%"></span>';
    element.after(backdrop);
  });
  await page.getByRole("button", { name: "Pick a color from the page", exact: true }).click();
  await page.locator("#sample-backdrop span").click();
  await expect(page.locator(".reader")).toHaveCSS("background-color", "rgb(204, 68, 0)");
  await page.getByRole("button", { name: "Pick a color from the page", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator("html")).not.toHaveClass(/sampling-paper-color/);
});

test("the home and My Character icons are the author's pictures in the text colour", async ({
  page,
}) => {
  await openOree(page);
  const home = page.getByRole("button", { name: "Listoire home", exact: true });
  const character = page.getByRole("button", { name: /My Character/ });
  for (const [button, file] of [
    [home, "home-icon.png"],
    [character, "rpg-icon.png"],
  ] as const) {
    const icon = button.locator(".picture-icon");
    await expect(icon).toHaveCSS("mask-image", new RegExp(file));
    const ink = await button.evaluate((element) => getComputedStyle(element).color);
    await expect(icon).toHaveCSS("background-color", ink);
  }
  await page.getByRole("button", { name: "Reading preferences", exact: true }).click();
  await page.getByRole("button", { name: "Page color #222b31", exact: true }).click();
  const dark = await home.evaluate((element) => getComputedStyle(element).color);
  await expect(home.locator(".picture-icon")).toHaveCSS("background-color", dark);
  expect(dark).not.toBe("rgb(0, 0, 0)");
});
