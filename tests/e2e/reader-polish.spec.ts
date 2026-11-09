import { expect, test } from "./test.ts";

test("text reaches its media before choices and the compact toolbar follows scrolling", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.getByRole("button", { name: "Play an existing story" }).click();
  await expect(page.getByRole("heading", { name: "The Girl in the Photograph" })).toBeVisible();
  await expect(page.locator(".choices")).toHaveCount(0);
  await expect(page.locator(".prose .narrative-media")).toHaveCount(0);
  await page.getByRole("button", { name: "Show all text", exact: true }).click();
  const photo = page.locator(".prose .narrative-media img").first();
  await expect(photo).toHaveAttribute("src", /house\.night\.webp$/);
  const secondParagraph = await page.locator(".prose > p").nth(1).boundingBox();
  expect((await photo.boundingBox())!.y).toBeGreaterThan(
    secondParagraph!.y + secondParagraph!.height,
  );
  await expect(page.getByRole("button", { name: "Continue reading", exact: true })).toBeVisible();
  const preferences = page.getByText("Reading preferences", { exact: true });
  const character = page.getByRole("button", { name: /My Character/ });
  expect((await character.boundingBox())!.x).toBeGreaterThan((await preferences.boundingBox())!.x);
  await page.evaluate(() => scrollTo(0, 350));
  await expect(preferences).toBeInViewport();
  await expect(character).toBeInViewport();
  expect((await page.locator(".reader-toolbar").boundingBox())!.y).toBeLessThan(5);
});

test("photograph keeps its dimensions, zooms from the center and writes on its reverse", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.getByRole("button", { name: "Play an existing story" }).click();
  await expect(page.getByRole("button", { name: "Show all text", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Examine the photograph", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "The photograph", exact: true });
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
  await expect(dialog.locator(".photo-caption")).not.toContainText("do not tell her your name");
  if (["chromium", "mobile"].includes(info.project.name))
    await page.screenshot({ path: info.outputPath("photograph-reverse.png"), fullPage: true });
});
