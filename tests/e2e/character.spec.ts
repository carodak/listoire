import { expect, test } from "./test.ts";
import { chooseFirst, playStory, readTo } from "./oree.ts";

test("character starts collapsed, retains rolled attributes, and reveals only known encounters", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/narration**", (route) => route.fulfill({ status: 503, body: "{}" }));
  await page.goto("/");
  await playStory(page);
  const tab = page.getByRole("button", { name: /My Character/ });
  await expect(tab).toHaveAttribute("aria-expanded", "false");
  await tab.click();
  await expect(page.locator(".character-stats")).toContainText("6/6");
  // "Health" carries a decorative heart (aria-hidden) before its name.
  await expect(page.locator(".character-stats dt")).toHaveText([/Health$/, "STR", "DEX", "WIL"]);
  const stats = await page.locator(".character-stats").innerText();
  await page.getByRole("button", { name: /Encounters/ }).click();
  const encounters = page.getByRole("dialog", { name: "Encounters", exact: true });
  await expect(encounters).toContainText("No one encountered yet.");
  await expect(encounters).not.toContainText("Nour");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Abilities/ }).click();
  await expect(page.getByRole("dialog", { name: "Abilities", exact: true })).toContainText(
    "Rank 1",
  );
  await page.keyboard.press("Escape");
  await chooseFirst(page);
  await expect(tab).toHaveAttribute("aria-expanded", "true");
  await readTo(page, "messagere"); // Nour delivers the letter
  await page.getByRole("button", { name: /Encounters/ }).click();
  await expect(encounters).toContainText("Nour");
  await expect(encounters.getByRole("heading", { name: "Nour", exact: true })).toBeVisible();
  await expect(encounters.getByText(/Former courier/)).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await playStory(page);
  await tab.click();
  expect(await page.locator(".character-stats").innerText()).toBe(stats);
});
