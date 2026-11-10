import { expect, test } from "./test.ts";
import { playStory } from "./oree.ts";
import { withFixtureStory } from "./fixture-story.ts";

test("a photograph detail runs a hidden story action whose clue survives reload", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await withFixtureStory(page);
  await page.goto("/");
  await playStory(page);
  const examine = page.getByRole("button", { name: "Examine the image", exact: true });
  await examine.click();
  const viewer = page.getByRole("dialog", { name: "The photograph", exact: true });
  await expect(viewer).toContainText("looks exactly like you");
  await page.getByRole("button", { name: "Inspect the photograph detail", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".prose")).toContainText("upstairs window in the photograph is open");
  await page.reload();
  await playStory(page);
  await page.getByRole("button", { name: /My Character/ }).click();
  await page.getByRole("button", { name: /Inventory/ }).click();
  await expect(page.getByRole("dialog", { name: "Inventory", exact: true })).toContainText(
    "Photograph clue",
  );
  await page.keyboard.press("Escape");
  await examine.click();
  await expect(
    page.getByRole("button", { name: "Inspect the photograph detail", exact: true }),
  ).toHaveCount(0);
});

test("a combat effect that ends fades out", async ({ page }) => {
  // Seed 19: Dawn stuns the guardian for one turn; the next attack ends the stun.
  await page.addInitScript(() => {
    crypto.getRandomValues = <T extends ArrayBufferView | null>(values: T) => {
      if (values instanceof Uint8Array) values.fill(251);
      if (values instanceof Uint32Array) values.fill(19);
      return values;
    };
  });
  await withFixtureStory(page);
  await page.goto("/");
  await playStory(page);
  await page.getByRole("button", { name: "Walk to the gate" }).click();
  await page.getByRole("button", { name: "Fight the guardian" }).click();
  const combat = page.locator(".reader-combat-modal");
  await combat.getByRole("button", { name: "Use an ability" }).click();
  await combat.getByRole("button", { name: /^Dawn/ }).click();
  const effect = combat.locator(".combat-effect");
  await expect(effect).toHaveText("Stunned (1)");
  await combat.getByRole("button", { name: "Basic attack" }).click();
  const ended = combat.locator(".combat-effect-ended");
  await expect(ended).toHaveText("Stunned (1)");
  await expect(ended).toHaveAttribute("aria-hidden", "true");
  expect(await ended.evaluate((element) => element.getAnimations().length)).toBe(1);
  await expect(effect).toHaveCount(0);
});
