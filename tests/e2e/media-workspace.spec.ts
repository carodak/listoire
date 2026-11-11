import { expect, test } from "./test.ts";

test("keeps the illustration visible while choosing duplicate layer instances in the embedded gallery", async ({
  page,
}) => {
  await page.goto("/editor");
  await expect(page.getByLabel("Ink script editor")).toBeVisible();
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  await expect(page.getByRole("button", { name: "3D Scene", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Image", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add Image", exact: true });
  await dialog.getByLabel("Illustration mode", { exact: true }).selectOption("layered");
  await dialog.getByRole("button", { name: "Character in forest", exact: true }).click();
  const beforeGallery = (await dialog.boundingBox())!;
  await dialog.getByRole("button", { name: "+ foreground", exact: true }).click();
  const gallery = dialog.getByRole("region", { name: "Media library", exact: true });
  await expect(gallery.getByLabel("Library depth layer")).toHaveValue("foreground");
  const withGallery = (await dialog.boundingBox())!;
  expect(Math.abs(withGallery.width - beforeGallery.width)).toBeLessThan(2);
  expect(Math.abs(withGallery.height - beforeGallery.height)).toBeLessThan(2);
  await gallery.getByLabel("Library depth layer").selectOption("");
  await gallery
    .getByLabel("Search media", { exact: true })
    .fill("sketch.curly-haired-woman-standing-001");
  await gallery
    .locator('article[data-asset="sketch.curly-haired-woman-standing-001"]')
    .getByRole("button", { name: "Use this media", exact: true })
    .click();
  await expect(gallery).toHaveCount(0);
  const planes = dialog.locator(
    '.multiplane-plane[data-image="sketch.curly-haired-woman-standing-001"]',
  );
  await expect(planes).toHaveCount(2);
  await dialog.getByLabel("Rotation (degrees)", { exact: true }).press("ArrowRight");
  const data = JSON.parse(await dialog.locator('input[name="illustration"]').inputValue());
  expect(data.layers.at(-1).rotation).toBe(1);
  await dialog
    .getByRole("button", { name: "high arrival hold pullback", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    dialog.getByRole("complementary", { name: "Illustration preview" }),
  ).toBeInViewport();
  await expect(dialog.locator(".multiplane-viewport")).toBeInViewport();
  await dialog.screenshot({ path: `.fallow/media-workspace-${test.info().project.name}.png` });
});

test("authors a combat action and enables the existing game mode", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByLabel("Ink script editor")).toBeVisible();
  await page.getByRole("tab", { name: "Game", exact: true }).click();
  await page.getByRole("button", { name: "Combat", exact: true }).click();
  const game = page.getByRole("dialog", { name: "Game · rules and actions", exact: true });
  await game.getByRole("button", { name: "Encounters", exact: true }).click();
  await game.getByRole("button", { name: "+ Encounter", exact: true }).click();
  await game.getByLabel("Stable ID", { exact: true }).fill("test-guard");
  await game.getByRole("button", { name: "Actions", exact: true }).click();
  await game.getByRole("button", { name: "+ Action", exact: true }).click();
  await game.getByLabel("Stable action ID", { exact: true }).fill("test-battle");
  await game.getByLabel("Use definition", { exact: true }).selectOption("test-guard");
  await game.getByRole("button", { name: "Apply game configuration", exact: true }).click();
  await expect(game).toHaveCount(0);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Game Mode", { exact: true })).toHaveValue("with-combat");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
});

test("cutting a // @media line and pasting it back restores the image and its settings", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/editor");
  await expect(page.locator(".preview-slot .prose")).toBeVisible({ timeout: 20_000 });
  const image = page.locator('.preview-slot [data-block="matin-ville.illustration"]');
  await expect(image).toBeVisible();
  const planes = await image.locator(".multiplane-plane").count();
  const script = () =>
    page
      .locator(".ink-editor")
      .evaluate((node) =>
        (node as unknown as { env: { editor: { getValue(): string } } }).env.editor.getValue(),
      );
  const line = "// @media matin-ville/matin-ville.illustration";
  // Select the whole reference line, as an author would before Ctrl+X.
  await page.locator(".ink-editor").evaluate((node, text) => {
    const editor = (
      node as unknown as {
        env: {
          editor: {
            getValue(): string;
            gotoLine(row: number, column: number): void;
            selection: { selectLine(): void };
          };
        };
      }
    ).env.editor;
    const row = editor
      .getValue()
      .split("\n")
      .findIndex((value) => value.startsWith(text));
    editor.gotoLine(row + 1, 0);
    editor.selection.selectLine();
  }, line);
  const input = page.locator(".ace_text-input");
  await input.press("Control+x");
  await expect.poll(script).not.toContain(line);
  await expect(image).toHaveCount(0);
  await input.press("Control+v");
  await expect.poll(script).toContain(line);
  await expect(image).toBeVisible();
  await expect(image.locator(".multiplane-plane")).toHaveCount(planes);
  // Its settings came back too: the dialog opens it as an existing image.
  await input.press("ArrowUp");
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  await page.getByRole("button", { name: "Edit Selected Media", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Edit Image", exact: true })).toBeVisible();
});
