import { expect, test } from "./test.ts";
test("character starts collapsed, retains rolled attributes, and reveals only known encounters", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Play an existing story" }).click();
  const tab = page.getByRole("button", { name: /My Character/ });
  await expect(tab).toHaveAttribute("aria-expanded", "false");
  await tab.click();
  await expect(page.locator(".character-stats")).toContainText("6/6");
  await expect(page.locator(".character-stats dt")).toHaveText(["Health", "STR", "DEX", "WIL"]);
  const stats = await page.locator(".character-stats").innerText();
  await page.getByRole("button", { name: /Encounters/ }).click();
  const encounters = page.getByRole("dialog", { name: "Encounters", exact: true });
  await expect(encounters).toContainText("Grandmother");
  await expect(encounters).not.toContainText("Unknown caller");
  await encounters.getByRole("button", { name: "Grandmother", exact: true }).focus();
  await expect(encounters.getByText(/whose photograph and warning/)).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Abilities/ }).click();
  await expect(page.getByRole("dialog", { name: "Abilities", exact: true })).toContainText(
    "Rank 1",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Continue reading", exact: true }).click();
  await expect(tab).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: /Encounters/ }).click();
  await expect(page.getByRole("dialog", { name: "Encounters", exact: true })).toContainText(
    "Unknown caller",
  );
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("button", { name: "Play an existing story" }).click();
  await tab.click();
  expect(await page.locator(".character-stats").innerText()).toBe(stats);
});
