import { expect, test } from "./test.ts";
import type { Locator, Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("keeps the illustration visible while choosing duplicate layer instances in the embedded gallery", async ({
  page,
}) => {
  await page.goto("/editor");
  await expect(page.getByLabel("Ink script editor")).toBeVisible();
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  await expect(page.getByRole("button", { name: "3D Scene", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Image", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add Image", exact: true });
  // Pass 9: no mode select; the starters are offered in the empty state.
  await dialog.getByRole("button", { name: "Character in forest", exact: true }).click();
  const beforeGallery = (await dialog.boundingBox())!;
  await dialog.getByRole("button", { name: "Add a picture in front", exact: true }).click();
  // The picker is for the front (it used to preselect a "foreground" depth filter).
  const gallery = dialog.getByRole("region", { name: "Add a picture: Front", exact: true });
  await expect(gallery).toBeVisible();
  const withGallery = (await dialog.boundingBox())!;
  expect(Math.abs(withGallery.width - beforeGallery.width)).toBeLessThan(2);
  expect(Math.abs(withGallery.height - beforeGallery.height)).toBeLessThan(2);
  await gallery
    .getByLabel("Search pictures", { exact: true })
    .fill("sketch.curly-haired-woman-standing-001");
  await gallery.locator('button[data-asset="sketch.curly-haired-woman-standing-001"]').click();
  await expect(gallery).toHaveCount(0);
  const planes = dialog.locator(
    '.multiplane-plane[data-image="sketch.curly-haired-woman-standing-001"]',
  );
  await expect(planes).toHaveCount(2);
  await dialog.getByLabel("Turn (°)", { exact: true }).press("ArrowRight");
  // Pass 9: the hidden JSON input is gone (typed form state); the same value is read from the
  // selected (last) layer as the preview draws it.
  expect(
    await planes
      .last()
      .locator("img")
      .evaluate((image) => image.style.getPropertyValue("--layer-rotation")),
  ).toBe("1deg");
  await dialog.getByLabel("Camera", { exact: true }).scrollIntoViewIfNeeded();
  await expect(dialog.getByRole("region", { name: "Preview", exact: true })).toBeInViewport();
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

async function openNewImage(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/editor");
  await expect(page.locator(".preview-slot .prose")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  await page.getByRole("button", { name: "Image", exact: true }).click();
  return page.getByRole("dialog", { name: "Add Image", exact: true });
}
const plane = (dialog: Locator, image: string) =>
  dialog.locator(`.multiplane-plane[data-image="${image}"]`);
const layerStyle = (target: Locator, name: string) =>
  target.locator("img").evaluate((image, key) => image.style.getPropertyValue(key), name);
const character = "sketch.curly-haired-woman-standing-001";

test("a new image starts with one clear step and the ready-made scenes", async ({ page }) => {
  const dialog = await openNewImage(page);
  const empty = dialog.getByRole("region", { name: "Start with a picture", exact: true });
  await expect(empty.getByRole("button", { name: "Choose a picture", exact: true })).toBeVisible();
  for (const scene of [
    "Landscape",
    "Character in forest",
    "Two moons",
    "Forest conversation",
    "Solitary traveller",
  ])
    await expect(empty.getByRole("button", { name: scene, exact: true })).toBeVisible();
  await expect(dialog.getByRole("group", { name: "Back", exact: true })).toContainText(
    "Start here",
  );
  // Nothing about a picture or a camera until there is one.
  await expect(dialog.getByText("Selected picture")).toHaveCount(0);
  await expect(dialog.getByLabel("Camera", { exact: true })).toHaveCount(0);
  await expect(dialog.locator(".image-more")).not.toHaveAttribute("open");
  await dialog.getByRole("button", { name: "Apply Image", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Select a licensed image.");
});

test("adds a picture at each depth in two clicks", async ({ page }) => {
  const dialog = await openNewImage(page);
  for (const [depth, button] of [
    ["Back", "Add a picture at the back"],
    ["Middle", "Add a picture in the middle"],
    ["Front", "Add a picture in front"],
  ] as const) {
    await dialog.getByRole("button", { name: button, exact: true }).click(); // 1
    const picker = dialog.getByRole("region", { name: `Add a picture: ${depth}`, exact: true });
    await picker.locator("button[data-asset]").first().click(); // 2
    await expect(picker).toHaveCount(0);
    await expect(
      dialog.getByRole("group", { name: depth, exact: true }).locator(".image-picture"),
    ).toHaveCount(1);
  }
  const roles = await dialog
    .locator(".multiplane-plane")
    .evaluateAll((planes) => planes.map((item) => (item as HTMLElement).dataset.role).sort());
  expect(roles).toEqual(["background", "foreground", "midground"]);
  // With several pictures, the camera list appears.
  await expect(dialog.getByLabel("Camera", { exact: true })).toBeVisible();
});

test("drag and drop: moves the selected picture, and a picture to another depth", async ({
  page,
}) => {
  const dialog = await openNewImage(page);
  await dialog.getByRole("button", { name: "Character in forest", exact: true }).click();
  const middle = dialog.getByRole("group", { name: "Middle", exact: true });
  await middle.locator(".image-picture").click();
  const person = plane(dialog, character);
  expect(await layerStyle(person, "--layer-x")).toBe("23%");
  // Drag in the preview: the selected picture follows the pointer.
  const stage = dialog.locator(".illustration-drag-stage");
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + box.width / 10, box.y + box.height / 2, {
    steps: 5,
  });
  await page.mouse.up();
  await expect.poll(() => layerStyle(person, "--layer-x").then(parseFloat)).toBeCloseTo(33, 0);
  // The arrow keys do the same, one step at a time.
  await stage.focus();
  await stage.press("ArrowUp");
  expect(parseFloat(await layerStyle(person, "--layer-y"))).toBe(4);
  // Drop the character's row on the front: it moves there.
  await middle
    .locator(".image-picture")
    .dragTo(dialog.getByRole("group", { name: "Front", exact: true }));
  await expect(person).toHaveAttribute("data-role", "foreground");
  await expect(
    dialog.getByRole("group", { name: "Front", exact: true }).locator(".image-picture"),
  ).toHaveCount(2);
  await expect(middle.locator(".image-picture")).toHaveCount(0);
});

test("Duplicate adds the same picture again, shifted, and both are applied", async ({ page }) => {
  const dialog = await openNewImage(page);
  await dialog.getByRole("button", { name: "Character in forest", exact: true }).click();
  await dialog
    .getByRole("group", { name: "Middle", exact: true })
    .locator(".image-picture")
    .click();
  await dialog.getByRole("button", { name: "Duplicate", exact: true }).click();
  const copies = plane(dialog, character);
  await expect(copies).toHaveCount(2);
  expect(await layerStyle(copies.last(), "--layer-x")).toBe("29%");
  expect(await layerStyle(copies.last(), "--layer-y")).toBe("11%");
  // The copy is selected; tilt and mirror it.
  await dialog.getByText("Tilt, flip and exact position", { exact: true }).click();
  for (let step = 0; step < 10; step++)
    await dialog.getByLabel("Turn left or right (°)", { exact: true }).press("ArrowRight");
  await dialog.getByLabel("Flip (mirror)", { exact: true }).check();
  await expect
    .poll(() =>
      copies
        .last()
        .locator("img")
        .evaluate((image) => getComputedStyle(image).transform),
    )
    .toMatch(/^matrix3d\(/);
  await dialog.getByRole("button", { name: "Apply Image", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Complete project backup", exact: true }).click();
  const backup = JSON.parse(await readFile((await (await download).path())!, "utf8"));
  const layers = Object.values(
    backup.languages.en.configuration.scenes as Record<
      string,
      { blocks?: { illustration?: { layers: { image: string }[] } }[] }
    >,
  )
    .flatMap((scene) => scene.blocks ?? [])
    .map((block) => block.illustration?.layers ?? [])
    .find((items) => items.filter((item) => item.image === character).length === 2)!;
  expect(layers.at(-1)).toMatchObject({ image: character, x: 29, y: 11, tiltY: 10, flip: true });
});
