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
  await dialog.getByRole("button", { name: "+ Add layer", exact: true }).click();
  // The picker is for a new layer (it used to preselect a "foreground" depth filter).
  const gallery = dialog.getByRole("region", { name: "Add a layer", exact: true });
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
  // Add it to an existing page ("chemin"), as an author would, from that page's text.
  await page.locator(".ink-editor").evaluate((node) => {
    const editor = (
      node as unknown as {
        env: { editor: { getValue(): string; gotoLine(row: number, column: number): void } };
      }
    ).env.editor;
    const row = editor
      .getValue()
      .split("\n")
      .findIndex((line) => line.startsWith("=== chemin ==="));
    editor.gotoLine(row + 2, 0);
  });
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  await page.getByRole("button", { name: "Image", exact: true }).click();
  return page.getByRole("dialog", { name: "Add Image", exact: true });
}
const plane = (dialog: Locator, image: string) =>
  dialog.locator(`.multiplane-plane[data-image="${image}"]`);
const layerStyle = (target: Locator, name: string) =>
  target.locator("img").evaluate((image, key) => image.style.getPropertyValue(key), name);
const character = "sketch.curly-haired-woman-standing-001";

const misty = "sketch.misty-conifer-plain-001";
const fern = "sketch.fern-fronds-001";
/** Searches the open picker and clicks that image: one click. */
async function pick(dialog: Locator, picker: string, image: string) {
  const list = dialog.getByRole("region", { name: picker, exact: true });
  await list.getByLabel("Search pictures", { exact: true }).fill(image);
  await list.locator(`button[data-asset="${image}"]`).click();
  await expect(list).toHaveCount(0);
}

test("a new image is one image: choose it, and it is stored as a single image", async ({
  page,
}) => {
  const dialog = await openNewImage(page);
  const image = dialog.getByRole("region", { name: "Image", exact: true });
  // Pass 11: no layer row until an image is chosen (in the start area).
  await expect(image.locator(".image-layer")).toHaveCount(0);
  await expect(image).toContainText("No image yet");
  await expect(dialog.getByRole("button", { name: "+ Add layer", exact: true })).toBeDisabled();
  // No depths, no camera, no selected-image settings until there is an image.
  await expect(dialog.getByRole("group", { name: "Back", exact: true })).toHaveCount(0);
  await expect(dialog.getByText("Selected picture")).toHaveCount(0);
  await expect(dialog.getByLabel("Camera", { exact: true })).toHaveCount(0);
  await expect(dialog.locator(".image-more")).not.toHaveAttribute("open");
  // The ready-made scenes are offered while the image is empty.
  for (const scene of ["Landscape", "Character in forest", "Two moons"])
    await expect(dialog.getByRole("button", { name: scene, exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Apply Image", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Select a licensed image.");
  // One way to choose: the start area's own button (Pass 11; nothing in the layers).
  await expect(dialog.getByRole("button", { name: /^Choose/ })).toHaveCount(1);
  const start = dialog.getByRole("region", { name: "Start with an image" });
  await start.getByRole("button", { name: "Choose an image", exact: true }).click();
  await pick(dialog, "Choose an image", misty);
  await expect(image).toContainText("Misty conifer plain");
  await expect(dialog.getByLabel("Camera", { exact: true })).toHaveCount(0);
  await expect(dialog.getByLabel("Depth", { exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "+ Add layer", exact: true })).toBeEnabled();
  // Pass 11: no "Choose" once there is an image; the selected image's "Replace image" changes it.
  await expect(dialog.getByRole("button", { name: /^(Choose|Change)/ })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: /^Replace/ })).toHaveCount(1);
  await dialog.getByRole("button", { name: "Apply Image", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  // Stored like every single image: the image, no layers.
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Complete project backup", exact: true }).click();
  const backup = JSON.parse(await readFile((await (await download).path())!, "utf8"));
  const blocks = Object.values(
    backup.languages.en.configuration.scenes as Record<
      string,
      { blocks?: { image?: string; illustration?: { layers: unknown[] } }[] }
    >,
  ).flatMap((scene) => scene.blocks ?? []);
  const block = blocks.find((item) => item.image === misty && item.illustration)!;
  expect(block.illustration!.layers).toEqual([]);
});

test("+ Add layer makes a layered scene in two clicks, at the depth each image suits", async ({
  page,
}) => {
  const dialog = await openNewImage(page);
  await dialog.getByRole("button", { name: "Choose an image", exact: true }).click();
  await pick(dialog, "Choose an image", misty);
  for (const [image, depth] of [
    [character, "Middle"],
    [fern, "Front"],
  ] as const) {
    await dialog.getByRole("button", { name: "+ Add layer", exact: true }).click(); // 1
    await pick(dialog, "Add a layer", image); // 2 (typing the search is not a click)
    await expect(
      dialog.getByRole("group", { name: depth, exact: true }).locator(".image-picture"),
    ).toHaveCount(1);
  }
  await expect(dialog.getByRole("region", { name: "Layers, front to back" })).toBeVisible();
  // Pass 11: no "Choose" once there is an image; the selected layer's "Replace image" changes it.
  await expect(dialog.getByRole("button", { name: /^(Choose|Change)/ })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Select Fern fronds" }).click();
  await expect(dialog.getByRole("button", { name: /^Replace/ })).toHaveCount(1);
  await dialog.getByRole("button", { name: "Replace image", exact: true }).click();
  await pick(dialog, "Replace image", character);
  await expect(plane(dialog, character)).toHaveCount(2);
  const roles = await dialog
    .locator(".multiplane-plane")
    .evaluateAll((planes) => planes.map((item) => (item as HTMLElement).dataset.role).sort());
  expect(roles).toEqual(["background", "foreground", "midground"]);
  // With several layers, the camera list and the depth appear; a layer can change depth.
  await expect(dialog.getByLabel("Camera", { exact: true })).toBeVisible();
  await dialog
    .getByRole("group", { name: "Middle", exact: true })
    .locator(".image-picture")
    .click();
  await dialog.getByLabel("Depth", { exact: true }).selectOption("foreground");
  await expect(
    dialog.getByRole("group", { name: "Front", exact: true }).locator(".image-picture"),
  ).toHaveCount(2);
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

test("an added image shows whole, a single image's frame follows its shape, and overflow shows faded", async ({
  page,
}) => {
  const dialog = await openNewImage(page);
  await dialog.getByRole("button", { name: "Choose an image", exact: true }).click();
  await pick(dialog, "Choose an image", character);
  await dialog.getByText("More options", { exact: true }).click();
  const frame = dialog.getByLabel("Frame", { exact: true });
  // A portrait image gets a portrait frame.
  await expect(frame).toHaveValue("portrait");
  // Larger than the frame: the reader will crop it; here the outside shows, faded.
  for (let step = 0; step < 20; step++)
    await dialog.getByLabel("Size", { exact: true }).press("ArrowRight");
  const viewport = dialog.locator(".multiplane-viewport");
  await expect(viewport).toHaveAttribute("data-aspect", "portrait");
  const image = plane(dialog, character).locator("img");
  await expect(image).toHaveAttribute("data-fit", "contain");
  await expect(image).toHaveCSS("object-fit", "contain");
  const sizes = await image.evaluate((node) => {
    const frame = node.closest(".multiplane-viewport")!;
    return {
      image: node.getBoundingClientRect().height,
      frame: frame.getBoundingClientRect().height,
      overflow: getComputedStyle(frame).overflow,
      veil: getComputedStyle(frame, "::after").boxShadow,
    };
  });
  expect(sizes.image).toBeGreaterThan(sizes.frame * 1.5);
  expect(sizes.overflow).toBe("visible");
  expect(sizes.veil).not.toBe("none");
  // The reader still crops at the frame.
  await expect(page.locator(".preview-slot .multiplane-viewport").first()).toHaveCSS(
    "overflow",
    "hidden",
  );
  // A background layer added now is whole too (not cropped to fill the frame).
  await dialog.getByRole("button", { name: "+ Add layer", exact: true }).click();
  await pick(dialog, "Add a layer", misty);
  await expect(plane(dialog, misty).locator("img")).toHaveCSS("object-fit", "contain");
  // A frame the author picks stays when the image changes.
  await frame.selectOption("square");
  await dialog.getByRole("button", { name: "Select Curly-haired woman standing" }).click();
  await dialog.getByRole("button", { name: "Replace image", exact: true }).click();
  await pick(dialog, "Replace image", fern);
  await expect(frame).toHaveValue("square");
});

test("corner handles resize the selected image in the preview; the slider stays in step", async ({
  page,
}) => {
  const dialog = await openNewImage(page);
  await dialog.getByRole("button", { name: "Character in forest", exact: true }).click();
  await dialog
    .getByRole("group", { name: "Middle", exact: true })
    .locator(".image-picture")
    .click();
  const handles = dialog.locator(".image-handle");
  await expect(handles).toHaveCount(4);
  const person = plane(dialog, character);
  const scale = () => layerStyle(person, "--layer-scale").then(Number);
  const before = await scale();
  // Drag the bottom-right corner away from the centre: bigger.
  const corner = handles.and(dialog.locator('[data-corner="se"]'));
  const box = (await corner.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 60, box.y + 60, { steps: 6 });
  await page.mouse.up();
  await expect.poll(scale).toBeGreaterThan(before);
  const bigger = await scale();
  await expect(dialog.getByLabel("Size", { exact: true })).toHaveValue(String(bigger));
  // Towards the centre: smaller. Dragging a corner never moves the image.
  const x = await layerStyle(person, "--layer-x");
  const top = (await dialog.locator('.image-handle[data-corner="nw"]').boundingBox())!;
  await page.mouse.move(top.x + top.width / 2, top.y + top.height / 2);
  await page.mouse.down();
  await page.mouse.move(top.x + 80, top.y + 80, { steps: 6 });
  await page.mouse.up();
  await expect.poll(scale).toBeLessThan(bigger);
  expect(await layerStyle(person, "--layer-x")).toBe(x);
});

test("removes an image with its × or Delete in the preview, and Undo brings it back", async ({
  page,
}) => {
  const dialog = await openNewImage(page);
  await dialog.getByRole("button", { name: "Character in forest", exact: true }).click();
  const planes = dialog.locator(".multiplane-plane");
  await expect(planes).toHaveCount(3);
  // A visible × on each layer, with its tooltip.
  const remove = dialog.getByRole("button", { name: "Remove Fern fronds", exact: true });
  await expect(remove).toHaveAttribute("title", "Remove this image");
  await remove.click();
  await expect(planes).toHaveCount(2);
  await expect(plane(dialog, fern)).toHaveCount(0);
  const status = dialog.getByRole("status").filter({ hasText: "Image removed" });
  await expect(status).toHaveText(/Image removed: Fern fronds\./);
  await status.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(plane(dialog, fern)).toHaveCount(1);
  await expect(status).toHaveCount(0);
  // Delete with the image selected in the preview; Ctrl+Z puts it back.
  await dialog
    .getByRole("group", { name: "Middle", exact: true })
    .locator(".image-picture")
    .click();
  const stage = dialog.locator(".illustration-drag-stage");
  await stage.focus();
  await stage.press("Delete");
  await expect(plane(dialog, character)).toHaveCount(0);
  await stage.press("Control+z");
  await expect(plane(dialog, character)).toHaveCount(1);
  // After another change, Undo is gone (it would undo that change too).
  await dialog.getByRole("button", { name: "Remove Fern fronds", exact: true }).click();
  await dialog.getByLabel("Size", { exact: true }).press("ArrowRight");
  await expect(status).toHaveCount(0);
});

test("the start area holds Choose an image while there is none; then + Add layer adds more", async ({
  page,
}) => {
  const dialog = await openNewImage(page);
  const start = dialog.getByRole("region", { name: "Start with an image", exact: true });
  const layers = dialog.getByRole("region", { name: "Image", exact: true });
  await expect(start.getByRole("button", { name: "Choose an image", exact: true })).toBeVisible();
  await expect(layers.getByRole("button", { name: /^Choose/ })).toHaveCount(0);
  await expect(layers).toContainText("No image yet");
  await expect(dialog.getByRole("button", { name: "+ Add layer", exact: true })).toBeDisabled();
  await start.getByRole("button", { name: "Choose an image", exact: true }).click();
  await pick(dialog, "Choose an image", misty);
  // Once there is an image: no start area, no "Choose", and more images come from + Add layer.
  await expect(start).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: /^Choose/ })).toHaveCount(0);
  await dialog.getByRole("button", { name: "+ Add layer", exact: true }).click();
  await pick(dialog, "Add a layer", character);
  await expect(dialog.locator(".multiplane-plane")).toHaveCount(2);
  await expect(dialog.getByRole("button", { name: /^Choose/ })).toHaveCount(0);
  // The selected image can still be replaced, keeping its place and size.
  await dialog.getByRole("button", { name: "Replace image", exact: true }).click();
  await pick(dialog, "Replace image", fern);
  await expect(plane(dialog, fern)).toHaveCount(1);
  await expect(plane(dialog, character)).toHaveCount(0);
});
