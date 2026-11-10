import { expect, test } from "./test.ts";
import { playStory } from "./oree.ts";

test("the character portrait follows the page colour live, like the illustrations", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/narration**", (route) => route.fulfill({ status: 503, body: "{}" }));
  await page.goto("/");
  await playStory(page);
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

test("the home and My Character icons are the author's pictures in the text colour", async ({
  page,
}) => {
  await page.route("**/api/narration**", (route) => route.fulfill({ status: 503, body: "{}" }));
  await page.goto("/");
  await playStory(page);
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
