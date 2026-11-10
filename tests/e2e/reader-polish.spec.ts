import { expect, test } from "./test.ts";
import { firstChoice, onPage, playStory, readTo, withExaminationReverse } from "./oree.ts";

test("text reaches its media before choices and the compact toolbar follows scrolling", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/api/narration**", (route) => route.fulfill({ status: 503, body: "{}" }));
  await page.goto("/");
  await playStory(page);
  await onPage(page, "matin-ville");
  const preferences = page.getByRole("button", { name: "Reading preferences", exact: true });
  await preferences.click();
  await page.getByLabel("Text display", { exact: true }).selectOption("progressive");
  await preferences.click();
  await page.getByRole("button", { name: "Replay page", exact: true }).click();
  await expect(page.locator(".choices")).toHaveCount(0);
  await expect(page.locator(".prose .narrative-media")).toHaveCount(0);
  await page.getByRole("button", { name: "Show all text", exact: true }).click();
  const picture = page.locator('.prose [data-block="matin-ville.illustration"]');
  await expect(picture).toBeVisible();
  const paragraph = await page.locator('[data-segment="matin-ville.p1"]').boundingBox();
  expect((await picture.boundingBox())!.y).toBeGreaterThan(paragraph!.y + paragraph!.height);
  await expect(firstChoice(page)).toBeVisible();
  const character = page.getByRole("button", { name: /My Character/ });
  expect((await character.boundingBox())!.x).toBeGreaterThan((await preferences.boundingBox())!.x);
  await page.evaluate(() => scrollTo(0, 350));
  await expect(preferences).toBeInViewport();
  await expect(character).toBeInViewport();
  expect((await page.locator(".reader-toolbar").boundingBox())!.y).toBeLessThan(5);
});

test("examined image keeps its dimensions, zooms from the center and writes on its reverse", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await withExaminationReverse(page, "Do not tell her your name.");
  await page.route("**/api/narration**", (route) => route.fulfill({ status: 503, body: "{}" }));
  await page.goto("/");
  await playStory(page);
  await expect(page.getByRole("button", { name: "Show all text", exact: true })).toHaveCount(0);
  await readTo(page, "messagere");
  await page.getByRole("button", { name: "Examine Nour", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Nour", exact: true });
  const window = dialog.locator(".photo-window");
  const surface = dialog.locator(".magnified-image");
  await expect(surface.locator(":scope > img")).toHaveJSProperty("complete", true);
  const before = await dialog.boundingBox();
  const area = await window.boundingBox();
  await surface.hover();
  await expect(dialog.locator(".magnifier-lens")).toBeVisible();
  await dialog.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(surface).toHaveCSS("transform", "matrix(1.5, 0, 0, 1.5, 0, 0)");
  const zoomed = (await surface.boundingBox())!;
  expect(zoomed.x + zoomed.width / 2).toBeCloseTo(area!.x + area!.width / 2, 0);
  await dialog.getByRole("button", { name: "Turn over", exact: true }).click();
  await expect(dialog.locator(".photo-reverse")).toHaveAttribute("data-writing", "true");
  const after = await dialog.boundingBox();
  expect(after!.width).toBeCloseTo(before!.width, 0);
  expect(after!.height).toBeCloseTo(before!.height, 0);
  expect((await window.boundingBox())!.height).toBeCloseTo(area!.height, 0);
  await expect(dialog.locator(".photo-reverse text").first()).toHaveAttribute("fill", "white");
  await expect(dialog.locator(".photo-caption")).not.toContainText("do not tell her your name", {
    ignoreCase: true,
  });
  if (["chromium", "mobile"].includes(info.project.name))
    await page.screenshot({ path: info.outputPath("photograph-reverse.png"), fullPage: true });
});
