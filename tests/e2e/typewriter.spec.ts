import { expect, test } from "./test.ts";

test("text is complete on arrival by default", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.getByRole("button", { name: "Play an existing story" }).click();
  await expect(page.locator(".prose")).toContainText("You will have to remember.");
  await expect(page.getByRole("button", { name: "Show all text", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Reading preferences" }).click();
  await expect(page.getByRole("combobox", { name: "Text display" })).toHaveValue("instant");
});

test("with the typewriter on, Show all text is keyboard-operable and completes the page", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/api/narration**", (route) => route.fulfill({ status: 503, body: "{}" }));
  await page.goto("/");
  await page.getByRole("button", { name: "Play an existing story" }).click();
  await page.getByRole("button", { name: "Reading preferences" }).click();
  await page.getByRole("combobox", { name: "Text display" }).selectOption("progressive");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Get back before the kettle boils over" }).click();
  const reveal = page.getByRole("button", { name: "Show all text", exact: true });
  await expect(reveal).toBeVisible();
  await expect(page.getByRole("button", { name: "Wrap the clock for delivery" })).toHaveCount(0);
  await reveal.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".prose")).toContainText("both bread rolls have disappeared");
  await expect(page.getByRole("button", { name: "Wrap the clock for delivery" })).toBeVisible();
  await expect(reveal).toHaveCount(0);
});
