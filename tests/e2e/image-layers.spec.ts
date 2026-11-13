import { expect, test } from "./test.ts";
import { backup } from "./editor.ts";
import {
  character,
  fern,
  layerStyle,
  misty,
  openNewImage,
  openSection,
  pick,
  plane,
  readyMade,
  selectAtDepth,
} from "./image-editor.ts";

test("keeps the illustration visible while choosing duplicate layer instances in the embedded gallery", async ({
  page,
  isMobile,
}) => {
  await page.goto("/editor");
  await expect(page.getByLabel("Ink script editor")).toBeVisible();
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  await expect(page.getByRole("button", { name: "3D Scene", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Image", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add Image", exact: true });
  // Pass 9: no mode select; the starters are offered in the empty state.
  await readyMade(dialog, "Character in forest");
  const beforeGallery = (await dialog.boundingBox())!;
  await dialog.getByRole("button", { name: "+ Add layer", exact: true }).click();
  // The picker is for a new layer (it used to preselect a "foreground" depth filter).
  const gallery = dialog.getByRole("region", { name: "Add a layer", exact: true });
  await expect(gallery).toBeVisible();
  const withGallery = (await dialog.boundingBox())!;
  expect(Math.abs(withGallery.width - beforeGallery.width)).toBeLessThan(2);
  expect(Math.abs(withGallery.height - beforeGallery.height)).toBeLessThan(2);
  await pick(dialog, "Add a layer", character);
  const planes = plane(dialog, character);
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
  await openSection(dialog, "Camera");
  await dialog.getByRole("group", { name: "Camera", exact: true }).scrollIntoViewIfNeeded();
  // Two columns keep the preview beside its settings; on a phone's one column it scrolls away.
  if (!isMobile) {
    await expect(dialog.getByRole("region", { name: "Preview", exact: true })).toBeInViewport();
    await expect(dialog.locator(".multiplane-viewport")).toBeInViewport();
  }
  await dialog.screenshot({ path: `.fallow/media-workspace-${test.info().project.name}.png` });
});

test("+ Add layer makes a layered scene in two clicks, at the depth each image suits", async ({
  page,
}) => {
  const dialog = await openNewImage(page);
  await dialog.getByRole("button", { name: "Choose an image", exact: true }).click();
  await pick(dialog, "Choose an image", misty);
  for (const [image, depth] of [
    [character, "Middleground"],
    [fern, "Foreground"],
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
  await expect(
    dialog.locator(".image-section > summary").filter({ hasText: /^Camera ·/ }),
  ).toBeVisible();
  await selectAtDepth(dialog, "Middleground");
  await dialog.getByLabel("Depth", { exact: true }).selectOption("foreground");
  await expect(
    dialog.getByRole("group", { name: "Foreground", exact: true }).locator(".image-picture"),
  ).toHaveCount(2);
});

test("drag and drop: moves the selected picture, and a picture to another depth", async ({
  page,
}) => {
  const dialog = await openNewImage(page);
  await readyMade(dialog, "Character in forest");
  const middle = dialog.getByRole("group", { name: "Middleground", exact: true });
  await middle.locator(".image-picture").click();
  const person = plane(dialog, character);
  expect(await layerStyle(person, "--layer-x")).toBe("23%");
  // Drag in the preview: the selected picture follows the pointer.
  const stage = dialog.locator(".illustration-drag-stage");
  await stage.scrollIntoViewIfNeeded(); // on a phone, scroll up to the preview first
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
    .dragTo(dialog.getByRole("group", { name: "Foreground", exact: true }));
  await expect(person).toHaveAttribute("data-role", "foreground");
  await expect(
    dialog.getByRole("group", { name: "Foreground", exact: true }).locator(".image-picture"),
  ).toHaveCount(2);
  await expect(middle.locator(".image-picture")).toHaveCount(0);
});

test("Duplicate adds the same picture again, shifted, and both are applied", async ({ page }) => {
  const dialog = await openNewImage(page);
  await readyMade(dialog, "Character in forest");
  await selectAtDepth(dialog, "Middleground");
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
  const saved = await backup(page);
  const layers = Object.values(
    saved.languages.en.configuration.scenes as Record<
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
  await openSection(dialog, "Look on the page");
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
  isMobile,
}) => {
  const dialog = await openNewImage(page);
  await readyMade(dialog, "Character in forest");
  await selectAtDepth(dialog, "Middleground");
  const handles = dialog.locator(".image-handle");
  await expect(handles).toHaveCount(4);
  const person = plane(dialog, character);
  const scale = () => layerStyle(person, "--layer-scale").then(Number);
  const before = await scale();
  // Drag the bottom-right corner away from the centre: bigger.
  const corner = handles.and(dialog.locator('[data-corner="se"]'));
  await corner.scrollIntoViewIfNeeded(); // on a phone, scroll up to the preview first
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
  // On a phone's small preview the enlarged picture's top-left corner is clipped: use the
  // bottom-right one, towards the centre too.
  const handle = isMobile ? corner : dialog.locator('.image-handle[data-corner="nw"]');
  const inward = isMobile ? -60 : 80;
  await handle.scrollIntoViewIfNeeded();
  const start = (await handle.boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(start.x + inward, start.y + inward, { steps: 6 });
  await page.mouse.up();
  await expect.poll(scale).toBeLessThan(bigger);
  expect(await layerStyle(person, "--layer-x")).toBe(x);
});

test("removes an image with its × or Delete in the preview, and Undo brings it back", async ({
  page,
}) => {
  const dialog = await openNewImage(page);
  await readyMade(dialog, "Character in forest");
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
  await selectAtDepth(dialog, "Middleground");
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

test("the layers panel: one row per layer, front to back, with an eye, depth, drag and keys", async ({
  page,
}) => {
  const dialog = await openNewImage(page);
  await readyMade(dialog, "Character in forest");
  const panel = dialog.getByRole("region", { name: "Layers, front to back", exact: true });
  const rows = panel.locator(".image-layer");
  const names = () =>
    rows
      .locator(".image-layer-name")
      .evaluateAll((items) => items.map((item) => item.firstChild!.textContent));
  const woman = "Curly-haired woman standing";
  await expect.poll(names).toEqual(["Fern fronds", woman, "Misty conifer plain"]);
  // A row: an eye, a thumbnail, the name and depth, and a ×.
  const fernRow = rows.filter({ has: page.getByRole("button", { name: "Select Fern fronds" }) });
  const eye = fernRow.getByRole("button", { name: "Show Fern fronds in the preview" });
  await expect(eye).toHaveAttribute("aria-pressed", "true");
  await expect(fernRow.locator("img")).toHaveCount(1);
  await expect(fernRow.locator(".image-layer-name small")).toHaveText("Foreground");
  await expect(fernRow.getByRole("button", { name: "Remove Fern fronds" })).toBeVisible();
  // The eye hides it in this preview only.
  await eye.click();
  await expect(eye).toHaveAttribute("aria-pressed", "false");
  await expect(plane(dialog, fern)).toHaveCSS("visibility", "hidden");
  // Click a row to select it.
  const girl = panel.getByRole("button", { name: `Select ${woman}` });
  await girl.click();
  await expect(girl).toHaveAttribute("aria-pressed", "true");
  // Drop it on the fern's upper half: in front of the fern, in the foreground.
  await girl.dragTo(panel.getByRole("button", { name: "Select Fern fronds" }), {
    targetPosition: { x: 20, y: 2 },
  });
  await expect.poll(names).toEqual([woman, "Fern fronds", "Misty conifer plain"]);
  await expect(plane(dialog, character)).toHaveAttribute("data-role", "foreground");
  const drawn = () =>
    dialog
      .locator(".multiplane-plane")
      .evaluateAll((planes) => planes.map((item) => (item as HTMLElement).dataset.image));
  expect((await drawn()).indexOf(character)).toBeGreaterThan((await drawn()).indexOf(fern));
  // The eye follows its layer.
  await expect(plane(dialog, fern)).toHaveCSS("visibility", "hidden");
  // Alt+↓: behind the fern; again: into the background, in front of the main picture.
  await girl.press("Alt+ArrowDown");
  await expect.poll(names).toEqual(["Fern fronds", woman, "Misty conifer plain"]);
  await expect(girl).toBeFocused();
  await girl.press("Alt+ArrowDown");
  await expect(plane(dialog, character)).toHaveAttribute("data-role", "background");
  const girlRow = rows.filter({ has: page.getByRole("button", { name: `Select ${woman}` }) });
  await expect(girlRow.locator(".image-layer-name small")).toHaveText("Background");
  // Delete on a row removes it; Undo brings it back, still hidden here.
  await panel.getByRole("button", { name: "Select Fern fronds" }).press("Delete");
  await expect(plane(dialog, fern)).toHaveCount(0);
  await dialog.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(plane(dialog, fern)).toHaveCSS("visibility", "hidden");
  // The eye shows it again.
  await eye.click();
  await expect(plane(dialog, fern)).toHaveCSS("visibility", "visible");
});
