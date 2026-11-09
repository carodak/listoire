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
