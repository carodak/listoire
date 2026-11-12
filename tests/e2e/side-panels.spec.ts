import { expect, test } from "./test.ts";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Play an existing story" }).click();
});

test("reading preferences take focus, close on Escape and return focus to their button", async ({
  page,
}) => {
  const opener = page.getByRole("button", { name: "Reading preferences" });
  await opener.click();
  const panel = page.getByRole("complementary", { name: "Reading preferences" });
  await expect(panel).toBeFocused();
  await panel.getByRole("button", { name: "Close", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("the character panel closes on Escape from inside, but not while a nested modal is open", async ({
  page,
}) => {
  const opener = page.getByRole("button", { name: /My Character/ });
  await opener.click();
  const panel = page.getByRole("complementary", { name: "My Character" });
  await expect(panel).toBeFocused();
  await panel.getByRole("button", { name: /Abilities/ }).click();
  const abilities = page.getByRole("dialog", { name: "Abilities", exact: true });
  await expect(abilities).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(abilities).toHaveCount(0);
  await expect(panel).toBeVisible();
  await panel.getByRole("button", { name: /Abilities/ }).focus();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("both side panels share one close control", async ({ page }) => {
  await page.getByRole("button", { name: "Reading preferences" }).click();
  await page
    .getByRole("complementary", { name: "Reading preferences" })
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page.getByRole("button", { name: /My Character/ }).click();
  await page
    .getByRole("complementary", { name: "My Character" })
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await expect(page.locator(".reader-sidebar")).toHaveCount(0);
});

test("dragging a volume slider applies every step but stores only the latest", async ({ page }) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    (window as unknown as { settingsWrites: number }).settingsWrites = 0;
    IDBObjectStore.prototype.put = function (value, key) {
      if (key === "reader-settings")
        (window as unknown as { settingsWrites: number }).settingsWrites++;
      return put.call(this, value, key);
    };
  });
  await page.reload();
  await page.getByRole("button", { name: "Play an existing story" }).click();
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
  const stored = () =>
    page.evaluate(
      () =>
        new Promise((resolve) => {
          const request = indexedDB.open("listoire");
          request.onsuccess = () => {
            const read = request.result
              .transaction("records")
              .objectStore("records")
              .get("reader-settings");
            read.onsuccess = () => resolve(read.result?.reading?.masterVolume);
          };
        }),
    );
  await expect.poll(stored).toBe(0);
  expect(
    await page.evaluate(() => (window as unknown as { settingsWrites: number }).settingsWrites),
  ).toBeLessThanOrEqual(2);
  await page.reload();
  await page.getByRole("button", { name: "Play an existing story" }).click();
  await page.getByRole("button", { name: "Reading preferences" }).click();
  await expect(page.getByLabel("Master volume", { exact: true })).toHaveValue("0");
});
