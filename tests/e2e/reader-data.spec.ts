import { expect, test } from "./test.ts";
import type { Page } from "@playwright/test";

async function openCharacter(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Play an existing story", exact: true }).click();
  await page.getByRole("button", { name: "My Character", exact: true }).click();
}

test("opens character details and retains personal notes independently of the story", async ({
  page,
}) => {
  await openCharacter(page);
  await expect(page.locator(".character-stats")).toContainText("6/6");
  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  await page.getByRole("tab", { name: "Equipment", exact: true }).click();
  await page.getByRole("tab", { name: "Equipment", exact: true }).press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Consumables", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Abilities", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Abilities", exact: true })).toContainText(
    "Rank 1",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Encounters", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Encounters", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  const notes = page.getByRole("dialog", { name: "Notes", exact: true });
  await notes.getByLabel("Your notes", { exact: true }).fill("Keep the address for tomorrow.");
  await notes.getByRole("button", { name: "Save", exact: true }).click();
  await expect(notes.getByRole("status")).toHaveText("Notes saved.");
  await notes.getByLabel("Your notes", { exact: true }).fill("An unsaved replacement");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.keyboard.press("Escape");
  await expect(notes).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await expect(notes.getByLabel("Your notes", { exact: true })).toHaveValue(
    "Keep the address for tomorrow.",
  );
});

test("keeps unsaved notes available to copy when storage rejects a write", async ({ page }) => {
  await openCharacter(page);
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  const notes = page.getByRole("dialog", { name: "Notes", exact: true });
  await notes.getByLabel("Your notes", { exact: true }).fill("Do not lose this text.");
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (String(key).startsWith("notes:")) throw new DOMException("Full", "QuotaExceededError");
      return put.call(this, value, key);
    };
  });
  await notes.getByRole("button", { name: "Save", exact: true }).click();
  await expect(notes.getByRole("alert")).toContainText("Notes could not be saved");
  await expect(notes.getByLabel("Your notes", { exact: true })).toHaveValue(
    "Do not lose this text.",
  );
});

test("samples artwork pixels and ignores toolbar clicks while the paper eyedropper is active", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Play an existing story", exact: true }).click();
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
