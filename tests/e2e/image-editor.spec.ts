import { expect, test } from "./test.ts";
import type { Locator, Page } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { browserHouseProject } from "../fixtures/house-project.ts";
import { StoryProjectSchema } from "../../src/contracts/editor-project.ts";
import { addIllustrationLibrary } from "../../src/features/editor/illustration-pack.ts";
import { compileProject } from "../../src/features/editor/compiler.ts";
import { illustrationDefaults } from "../../src/contracts/illustration.ts";
import { CinematicSchema } from "../../src/contracts/cinematic.ts";

type Ace = {
  getValue(): string;
  clearSelection(): void;
  gotoLine(row: number, column: number): void;
  focus(): void;
};
/** Puts the script's caret at the start of the first line containing `text` (or `offset` lines below). */
async function caretTo(page: Page, text: string, offset = 0) {
  await page.locator(".ink-editor").evaluate(
    (node, [text, offset]) => {
      const editor = (node as unknown as { env: { editor: Ace } }).env.editor;
      const row = editor
        .getValue()
        .split("\n")
        .findIndex((line) => line.includes(text as string));
      if (row < 0) throw new Error(`No line contains ${text}`);
      editor.clearSelection();
      editor.gotoLine(row + 1 + (offset as number), 0);
      editor.focus();
    },
    [text, offset] as const,
  );
}

/** The house fixture with a layered, moving illustration and a wide two-layer picture. */
const gallery = StoryProjectSchema.parse(
  JSON.parse(
    await readFile(new URL("../../public/stories/house/project.json", import.meta.url), "utf8"),
  ),
);
const project = addIllustrationLibrary(browserHouseProject, gallery);
for (const language of Object.values(project.languages)) {
  language.defaults.backgroundColor = "#eee6d8";
  const scene = language.configuration.scenes!.intro!;
  const illustration = illustrationDefaults();
  illustration.base.role = "background";
  illustration.layers.push({
    ...illustration.base,
    image: "sketch.curly-haired-woman-standing-001",
    role: "foreground",
  });
  const motion = CinematicSchema.parse({ preset: "parallax" });
  scene.blocks!.splice(1, 0, {
    kind: "media",
    id: "intro.paper",
    image: "sketch.misty-conifer-plain-001",
    layout: "inline",
    illustration,
    motion,
  });
  scene.events!.push({
    id: "intro.paper.motion",
    blockId: "intro.paper",
    trigger: { kind: "block", blockId: "intro.paper" },
    action: {
      kind: "effect",
      effect: { id: "cinematic-camera", duration: 14000, cinematic: motion },
    },
  });
  const wide = language.configuration
    .scenes!.arrival!.blocks!.filter((block) => block.kind === "media")
    .find((block) => block.id === "arrival.illustration")!;
  wide.image = "sketch.misty-conifer-plain-001";
  wide.illustration = {
    ...illustration,
    layers: [
      ...illustration.layers,
      {
        ...illustration.base,
        image: "sketch.fern-fronds-001",
        role: "midground",
      },
    ],
  };
}
const bundles = await compileProject(project);

test.describe("the Image dialog on Orée", () => {
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
    await readyMade(dialog, "Character in forest");
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
    await openSection(dialog, "Camera");
    await dialog.getByRole("group", { name: "Camera", exact: true }).scrollIntoViewIfNeeded();
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
    browserName,
  }) => {
    // Only Chromium names clipboard permissions; Ace's own cut and paste need none elsewhere.
    if (browserName === "chromium")
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
    if (browserName === "webkit")
      // WebKit for Windows hands Ace 1.2.6 an empty paste (a plain textarea pastes fine): paste
      // through Ace's own entry point. Real Safari paste is on the by-hand list.
      await page.locator(".ink-editor").evaluate((node, text) => {
        (
          node as unknown as { env: { editor: { onPaste(text: string): void } } }
        ).env.editor.onPaste(text);
      }, `${line}\n`);
    else await input.press("Control+v");
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
    await caretTo(page, "=== chemin ===", 1);
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
  /** Opens the start area's ready-made scenes (Pass 11: a toggle) and applies one. */
  async function readyMade(dialog: Locator, scene: string) {
    await dialog.getByRole("button", { name: "Ready-made scenes", exact: true }).click();
    await dialog.getByRole("button", { name: scene, exact: true }).click();
  }
  /** Opens (or closes) a folded settings section by its title. */
  async function openSection(dialog: Locator, title: string) {
    await dialog
      .locator(".image-section > summary")
      .filter({ hasText: new RegExp(`^${title}( ·|$)`) })
      .click();
  }
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
    await expect(dialog.getByRole("group", { name: "Background", exact: true })).toHaveCount(0);
    await expect(dialog.getByText("Selected picture")).toHaveCount(0);
    // Pass 11: the camera is a folded section; a single image has none.
    await expect(
      dialog.locator(".image-section > summary").filter({ hasText: /^Camera/ }),
    ).toHaveCount(0);
    // Pass 11: the settings are folded sections, all closed (no "More options").
    await expect(dialog.locator(".image-section")).not.toHaveCount(0);
    await expect(dialog.locator(".image-section[open]")).toHaveCount(0);
    // The ready-made scenes are offered while the image is empty (Pass 11: behind a toggle).
    await dialog.getByRole("button", { name: "Ready-made scenes", exact: true }).click();
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
    // Pass 11: the camera is a folded section; a single image has none.
    await expect(
      dialog.locator(".image-section > summary").filter({ hasText: /^Camera/ }),
    ).toHaveCount(0);
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
    await dialog
      .getByRole("group", { name: "Middleground", exact: true })
      .locator(".image-picture")
      .click();
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
    await dialog
      .getByRole("group", { name: "Middleground", exact: true })
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
  }) => {
    const dialog = await openNewImage(page);
    await readyMade(dialog, "Character in forest");
    await dialog
      .getByRole("group", { name: "Middleground", exact: true })
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
    await dialog
      .getByRole("group", { name: "Middleground", exact: true })
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

  test("ready-made scenes are a closed toggle in the start area, and only there", async ({
    page,
  }) => {
    const dialog = await openNewImage(page);
    const start = dialog.getByRole("region", { name: "Start with an image", exact: true });
    const toggle = start.getByRole("button", { name: "Ready-made scenes", exact: true });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(
      dialog.getByRole("button", { name: "Character in forest", exact: true }),
    ).toHaveCount(0);
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    const scenes = start.getByRole("group", { name: "Ready-made scenes", exact: true });
    await expect(scenes.getByRole("button")).toHaveCount(5);
    await scenes.getByRole("button", { name: "Character in forest", exact: true }).click();
    await expect(dialog.locator(".multiplane-plane")).toHaveCount(3);
    // No second copy further down the dialog.
    await expect(start).toHaveCount(0);
    for (const summary of await dialog.locator(".image-section > summary").all())
      await summary.click();
    await expect(dialog.getByText("Ready-made scenes")).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Landscape", exact: true })).toHaveCount(0);
  });

  test("the picker shows In this story and Library as tabs, each filtered by depth", async ({
    page,
  }) => {
    const dialog = await openNewImage(page);
    await dialog.getByRole("button", { name: "Choose an image", exact: true }).click();
    const picker = dialog.getByRole("region", { name: "Choose an image", exact: true });
    const tabs = picker.getByRole("tab");
    await expect(tabs).toHaveText(["In this story", "Library"]);
    // Both tabs are in view from the start, above the pictures (no scrolling to find the library).
    await expect(tabs.last()).toBeInViewport();
    const inStory = picker.getByRole("tab", { name: "In this story", exact: true });
    const library = picker.getByRole("tab", { name: "Library", exact: true });
    await expect(inStory).toHaveAttribute("aria-selected", "true");
    const panel = picker.getByRole("tabpanel");
    const filters = panel.getByRole("group", { name: "Filter by depth", exact: true });
    await expect(filters.getByRole("button")).toHaveText([
      "All",
      "Foreground",
      "Middleground",
      "Background",
    ]);
    await expect(filters.getByRole("button", { name: "All", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const asset = (id: string) => panel.locator(`button[data-asset="${id}"]`);
    // In this story: the fern the story already uses, not the library's misty plain.
    await expect(asset(fern)).toBeVisible();
    await expect(asset(misty)).toHaveCount(0);
    await filters.getByRole("button", { name: "Background", exact: true }).click();
    await expect(asset(fern)).toHaveCount(0);
    await filters.getByRole("button", { name: "Foreground", exact: true }).click();
    await expect(asset(fern)).toBeVisible();
    // Library: pictures the story doesn't use yet, with the same filters.
    await library.click();
    await expect(library).toHaveAttribute("aria-selected", "true");
    await expect(asset(misty)).toHaveCount(0);
    await filters.getByRole("button", { name: "Background", exact: true }).click();
    await expect(asset(misty)).toBeVisible();
    await expect(asset(fern)).toHaveCount(0);
    // A long list scrolls; its cards keep their full thumbnail and name.
    await filters.getByRole("button", { name: "All", exact: true }).click();
    const first = panel.locator("button[data-asset]").first();
    expect((await first.locator("img").boundingBox())!.height).toBeGreaterThan(60);
    await expect(first.locator("span")).toBeVisible();
    await filters.getByRole("button", { name: "Background", exact: true }).click();
    await filters.getByRole("button", { name: "All", exact: true }).click();
    // The arrow keys move between the tabs.
    await library.press("ArrowLeft");
    await expect(inStory).toBeFocused();
    await expect(inStory).toHaveAttribute("aria-selected", "true");
    // A search with no match here but some in the other tab shows that tab.
    await picker.getByLabel("Search pictures", { exact: true }).fill(misty);
    await expect(library).toHaveAttribute("aria-selected", "true");
    await asset(misty).click();
    await expect(plane(dialog, misty)).toHaveCount(1);
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

  test("no More options: each settings category is its own section, closed by default", async ({
    page,
  }) => {
    const dialog = await openNewImage(page);
    await readyMade(dialog, "Character in forest");
    await expect(dialog.getByText("More options")).toHaveCount(0);
    const sections = dialog.locator(".image-section");
    await expect(sections).toHaveCount(6);
    await expect(dialog.locator(".image-section[open]")).toHaveCount(0);
    // Each opens on its own.
    await openSection(dialog, "Look on the page");
    await expect(dialog.locator(".image-section[open]")).toHaveCount(1);
    await expect(dialog.getByLabel("Frame", { exact: true })).toBeVisible();
    await openSection(dialog, "Look on the page");
    await expect(dialog.getByLabel("Frame", { exact: true })).toBeHidden();
    // A closed section says what is set inside it.
    await openSection(dialog, "Description & caption");
    await dialog.getByLabel("Caption (shown under the image)").fill("Under the trees");
    await openSection(dialog, "Description & caption");
    await expect(
      dialog.locator(".image-section > summary").filter({ hasText: /^Description & caption/ }),
    ).toContainText(/set: .*caption/);
  });

  test("Description & caption: each label says where its text goes", async ({ page }) => {
    const dialog = await openNewImage(page);
    await dialog.getByRole("button", { name: "Choose an image", exact: true }).click();
    await pick(dialog, "Choose an image", misty);
    await expect(
      dialog.locator(".image-section > summary").filter({ hasText: /^Text/ }),
    ).toHaveCount(0);
    await openSection(dialog, "Description & caption");
    const description = dialog.getByLabel("Description (not shown, read aloud by screen readers)", {
      exact: true,
    });
    const caption = dialog.getByLabel("Caption (shown under the image)", { exact: true });
    // The description starts from the picture's own.
    await expect(description).not.toHaveValue("");
    await description.fill("Conifers fading into the mist");
    await caption.fill("The plain at dawn");
    await dialog.getByRole("button", { name: "Apply Image", exact: true }).click();
    await page.getByRole("button", { name: "Preview from chemin", exact: true }).click();
    const figure = page
      .locator(".preview-slot figure")
      .filter({ has: page.getByText("The plain at dawn", { exact: true }) });
    await expect(figure).toBeVisible();
    // The caption shows; the description is the picture's text alternative, not shown.
    await expect(figure.locator("img").first()).toHaveAttribute(
      "alt",
      "Conifers fading into the mist",
    );
    await expect(figure.getByText("Conifers fading into the mist")).toHaveCount(0);
  });

  test("Interactivity: image examination has its own section", async ({ page }) => {
    const dialog = await openNewImage(page);
    await dialog.getByRole("button", { name: "Choose an image", exact: true }).click();
    await pick(dialog, "Choose an image", misty);
    const summary = dialog
      .locator(".image-section > summary")
      .filter({ hasText: /^Interactivity/ });
    await expect(summary.locator("..")).not.toHaveAttribute("open");
    // Not with the description and caption any more.
    const described = dialog.locator(".image-section").filter({
      has: page.locator("summary", { hasText: /^Description & caption/ }),
    });
    await expect(described).toHaveCount(1);
    await expect(described.getByLabel("Media examinable", { exact: true })).toHaveCount(0);
    await openSection(dialog, "Interactivity");
    await dialog.getByLabel("Media examinable", { exact: true }).check();
    await expect(dialog.getByLabel("Examination title", { exact: true })).toBeVisible();
    await openSection(dialog, "Interactivity");
    await expect(summary).toContainText("set: examine");
    // A cinematic (full-screen) image disappears: nothing to examine, no section.
    await openSection(dialog, "Look on the page");
    await dialog.getByRole("button", { name: "Cinematic", exact: true }).click();
    await expect(summary).toHaveCount(0);
  });

  test("the camera is a folded section, with its settings folded right under the presets", async ({
    page,
  }) => {
    const dialog = await openNewImage(page);
    await dialog.getByRole("button", { name: "Choose an image", exact: true }).click();
    await pick(dialog, "Choose an image", misty);
    // A single image has no camera, so no camera settings.
    const settings = dialog.locator(".image-section .image-section").filter({
      has: page.locator("summary", { hasText: /^Camera settings/ }),
    });
    await expect(settings).toHaveCount(0);
    await dialog.getByRole("button", { name: "+ Add layer", exact: true }).click();
    await pick(dialog, "Add a layer", character);
    await expect(settings).toHaveCount(1);
    await expect(settings).not.toHaveAttribute("open");
    // The Camera section is closed too; inside, the settings come right after the presets.
    const camera = settings.locator("..");
    await expect(camera).not.toHaveAttribute("open");
    await openSection(dialog, "Camera");
    const next = await dialog
      .getByRole("group", { name: "Camera", exact: true })
      .evaluate((presets) => presets.nextElementSibling?.querySelector("summary")?.textContent);
    expect(next).toMatch(/^Camera settings/);
    await openSection(dialog, "Camera settings");
    const duration = dialog.getByLabel("Movement duration (seconds)", { exact: true });
    await expect(duration).toBeVisible();
    await duration.fill("7");
    await openSection(dialog, "Camera settings");
    await expect(settings.locator("summary")).toContainText("set: changed");
  });

  test("settings order: Look on the page (with On the page), Camera, When to display the media, Interactivity, Description & caption", async ({
    page,
  }) => {
    const dialog = await openNewImage(page);
    await readyMade(dialog, "Character in forest");
    const sections = dialog.locator(".image-editor-main > .image-section");
    const titles = await sections
      .locator("> summary")
      .evaluateAll((items) => items.map((item) => item.firstChild!.textContent));
    expect(titles).toEqual([
      "Look on the page",
      "Camera",
      "When to display the media",
      "Interactivity",
      "Description & caption",
    ]);
    await expect(dialog.locator(".image-section[open]")).toHaveCount(0);
    // "On the page" is inside "Look on the page", whose summary shows the layout.
    const look = sections.first();
    await expect(look.locator(".media-layout")).toHaveCount(1);
    await expect(dialog.locator(".image-editor-main > .media-layout")).toHaveCount(0);
    await openSection(dialog, "Look on the page");
    await look.getByRole("button", { name: "Wide", exact: true }).click();
    await openSection(dialog, "Look on the page");
    await expect(look.locator("> summary")).toHaveText("Look on the page · Wide");
    // The camera folds too, with its settings folded inside; its summary shows the preset.
    const camera = sections.nth(1);
    await openSection(dialog, "Camera");
    // The presets keep their name for screen readers, without repeating the title on screen.
    await expect(camera.getByRole("group", { name: "Camera", exact: true })).toBeVisible();
    expect(
      await camera.locator(".preset-cards > legend").evaluate((legend) => legend.clientWidth),
    ).toBeLessThanOrEqual(1);
    await camera.getByRole("button", { name: "Gentle depth", exact: true }).click();
    await expect(camera.locator("> summary")).toHaveText("Camera · Gentle depth");
    await expect(camera.locator(".image-section > summary")).toHaveText("Camera settings");
  });
});

test.describe("composition on the house fixture", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/stories/house/project.json", (route) => route.fulfill({ json: project }));
    await page.route("**/stories/house/en.json", (route) => route.fulfill({ json: bundles.en }));
  });

  test("composes gallery layers, crops and wraps them, then restores a complete project backup", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/editor");
    await expect(page.getByLabel("Ink script editor")).toBeVisible();
    await expect(page.locator(".ace_text-input")).toHaveCount(1);
    await page
      .getByLabel("Find in Ink", { exact: true })
      .fill("The girl beside her looked exactly like you.");
    await page.getByLabel("Find in Ink", { exact: true }).press("Enter");
    await page.getByLabel("Close search", { exact: true }).click();
    await page.getByRole("tab", { name: "Media", exact: true }).click();
    await page.getByRole("button", { name: "Image", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Add Image", exact: true });
    await dialog.getByRole("button", { name: "Ready-made scenes", exact: true }).click();
    await dialog.getByRole("button", { name: "Character in forest", exact: true }).click();
    await expect(dialog.locator(".multiplane-plane")).toHaveCount(3);
    await dialog.getByRole("button", { name: "+ Add layer", exact: true }).click();
    const library = dialog.getByRole("region", { name: "Add a layer", exact: true });
    await library.getByLabel("Search pictures", { exact: true }).fill("fern-fronds-001");
    await library.locator('button[data-asset$="fern-fronds-001"]').first().click();
    await dialog.getByLabel("Size", { exact: true }).press("ArrowRight");
    await dialog.getByLabel("Size", { exact: true }).press("ArrowRight");
    await dialog.getByRole("button", { name: "Safe frame", exact: true }).click();
    await expect(dialog.locator(".image-safe-margin")).toBeVisible();
    // Pass 11: no "More options"; each settings category is its own folded section.
    for (const section of [
      /^Look on the page/,
      /^Camera ·/,
      /^Camera settings/,
      /^Description & caption/,
    ])
      await dialog.locator(".image-section > summary").filter({ hasText: section }).click();
    await dialog.getByLabel("Text wrapping", { exact: true }).selectOption("right");
    // Pass 11: the presets are cards (with a moving preview), not a list.
    await dialog
      .getByRole("group", { name: "Camera", exact: true })
      .getByRole("button", { name: "Gentle depth", exact: true })
      .click();
    await dialog.getByLabel("Movement duration (seconds)", { exact: true }).fill("6.5");
    await dialog.getByLabel("Caption (shown under the image)").fill("Layered forest test");
    await dialog.getByRole("button", { name: "Apply Image", exact: true }).click();
    await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
    const figure = page
      .locator(".preview-slot figure")
      .filter({ has: page.getByText("Layered forest test", { exact: true }) });
    await expect(figure).toBeVisible();
    await expect(figure).toHaveAttribute("data-wrap", "right");
    await expect(figure.locator(".multiplane-plane")).toHaveCount(4);
    const paper = figure.locator(".illustration-blend");
    await expect(paper).toHaveCSS("mix-blend-mode", "multiply");
    await expect(paper).not.toHaveCSS("mask-image", "none");
    await expect(figure.locator(".multiplane-camera")).toHaveCSS("transform-style", "preserve-3d");
    await expect(figure.locator(".multiplane-viewport")).toHaveCSS("perspective", "800px");
    await figure.screenshot({ path: ".fallow/paper-composition.png" });
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("button", { name: "Export", exact: true }).click();
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: "Complete project backup", exact: true }).click();
    const bytes = await readFile((await (await pending).path())!);
    const backup = JSON.parse(bytes.toString());
    const block = backup.languages.en.configuration.scenes.intro.blocks.find(
      (block: { caption: string }) => block.caption === "Layered forest test",
    );
    expect(block.illustration.layers).toHaveLength(3);
    expect(block.motion.durationMs).toBe(6500);
    expect(block.illustration.layers[2].scale).toBe(1.1);
    await page.getByRole("button", { name: "Close dialog", exact: true }).click();
    await page.getByRole("button", { name: "Load / Import", exact: true }).click();
    await page
      .locator('input[type=file][accept=".ink,.json"]')
      .setInputFiles({ name: "layered.json", mimeType: "application/json", buffer: bytes });
    await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
    await expect(figure.locator(".multiplane-plane")).toHaveCount(4);
    await expect
      .poll(() =>
        figure.locator(".multiplane-camera").evaluate((node) => node.getAnimations().length),
      )
      .toBe(0);
    await page.route("**/stories/house/project.json", (route) => route.fulfill({ status: 503 }));
    await page.getByRole("button", { name: "Load / Import", exact: true }).click();
    await page.getByRole("button", { name: "Apply new illustration pack", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Load / Import", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
    await expect(figure.locator(".multiplane-plane")).toHaveCount(4);
  });

  test("upgrades legacy image layers, wraps a transparent character and changes page color", async ({
    page,
  }) => {
    test.setTimeout(45000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/editor");
    await expect(page.getByLabel("Ink script editor")).toBeVisible();
    await page.getByRole("tab", { name: "Media", exact: true }).click();
    await page.getByRole("button", { name: "Image", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Add Image", exact: true });
    await dialog.getByRole("button", { name: "Choose an image", exact: true }).click();
    await page
      .getByLabel("Search pictures", { exact: true })
      .fill("curly-haired-woman-standing-001");
    await dialog.locator('button[data-asset="sketch.curly-haired-woman-standing-001"]').click();
    await expect(dialog.getByLabel("More camera presets", { exact: true })).toHaveCount(0);
    await dialog.getByRole("button", { name: "+ Add layer", exact: true }).click();
    await page.getByLabel("Search pictures", { exact: true }).fill("fern-fronds-001");
    await dialog.locator('button[data-asset$="fern-fronds-001"]').first().click();
    await expect(dialog.locator(".multiplane-plane")).toHaveCount(2);
    // The fern, just added, is the selected picture.
    await dialog.getByRole("button", { name: "Remove Fern fronds", exact: true }).click();
    for (const section of [/^When to display the media/, /^Look on the page/])
      await dialog.locator(".image-section > summary").filter({ hasText: section }).click();
    await dialog
      .getByRole("group", { name: "Entrance", exact: true })
      .getByRole("button", { name: "None", exact: true })
      .click();
    await dialog.getByLabel("Text wrapping", { exact: true }).selectOption("left");
    await dialog.getByRole("button", { name: "Apply Image", exact: true }).click();
    await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
    const figure = page.locator('.preview-slot figure[data-wrap="left"]');
    await expect(figure).toBeVisible();
    await expect(figure).toHaveCSS(
      "shape-outside",
      /url\(.*sketch\.curly-haired-woman-standing-001\.webp/,
    );
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("button", { name: "Page color #080b0d", exact: true }).click();
    await page.getByRole("button", { name: "Apply settings", exact: true }).click();
    await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
    await expect(page.locator(".preview-slot .reader")).toHaveCSS(
      "background-color",
      "rgb(8, 11, 13)",
    );
    await expect(figure.locator(".illustration-blend")).toHaveCSS("mix-blend-mode", "screen");
  });

  test("uses real perspective depth, pauses camera motion and removes it on page departure", async ({
    page,
  }) => {
    test.setTimeout(45000);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.route("**/stories/house/en.json", async (route) => {
      const bundle = structuredClone(bundles.en!);
      const scene = bundle.scenes!.intro!;
      const images = scene.blocks!.filter((block) => block.kind === "media");
      const artwork = images.find((block) => block.id === "intro.artwork")!;
      const inline = images.find((block) => block.id === "intro.paper")!;
      artwork.image = inline.image;
      artwork.illustration = structuredClone(inline.illustration);
      artwork.illustration!.layers.push({
        image: "paper.modern-male-character",
        role: "midground",
        x: 15,
        y: 0,
        scale: 0.9,
      });
      artwork.motion = inline.motion;
      scene.events!.push({
        ...scene.events!.find((event) => event.blockId === "intro.paper")!,
        id: "intro.artwork.motion",
        blockId: "intro.artwork",
        trigger: { kind: "block", blockId: "intro.artwork" },
      });
      await route.fulfill({ json: bundle });
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Play an existing story", exact: true }).click();
    const camera = page.locator(".story-art .multiplane-camera");
    await expect
      .poll(() => camera.evaluate((node) => node.getAnimations({ subtree: true }).length))
      .toBe(3);
    const shifts = await camera.evaluate((node) => {
      const animations = node.getAnimations({ subtree: true });
      animations.forEach((animation) => {
        animation.pause();
        animation.currentTime = 0;
      });
      const planes = [...node.querySelectorAll<HTMLElement>(".multiplane-plane")];
      const starts = planes.map((plane) => plane.getBoundingClientRect().x);
      animations.forEach((animation) => {
        animation.currentTime = 7000;
      });
      return Object.fromEntries(
        planes.map((plane, index) => [
          plane.dataset.role,
          plane.getBoundingClientRect().x - starts[index]!,
        ]),
      );
    });
    expect(Math.abs(shifts.foreground)).toBeGreaterThan(1);
    expect(shifts.midground / shifts.foreground).toBeCloseTo(0.5, 1);
    expect(shifts.background / shifts.foreground).toBeCloseTo(0.15, 1);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await expect
      .poll(() =>
        camera.evaluate((node) =>
          node
            .getAnimations({ subtree: true })
            .every((animation) => animation.playState === "paused"),
        ),
      )
      .toBe(true);
    await page.getByRole("button", { name: "Resume", exact: true }).click();
    await page.locator(".prose p").first().click();
    await page.getByRole("button", { name: "Continue reading", exact: true }).click();
    await expect(page.locator('[data-block="intro.artwork"]')).toHaveCount(0);
  });

  test("keeps wide paper illustrations clear of the preceding text", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("button", { name: "Play an existing story", exact: true }).click();
    await page.getByRole("button", { name: "Continue reading", exact: true }).click();
    await page.getByRole("button", { name: "Ask about the locked room", exact: true }).click();
    await page.getByRole("button", { name: "Continue reading", exact: true }).click();
    const figure = page.locator('[data-block="arrival.illustration"]');
    await expect(figure).toBeVisible();
    const gap = await figure.evaluate(
      (node) =>
        node.getBoundingClientRect().top -
        node.previousElementSibling!.getBoundingClientRect().bottom,
    );
    expect(gap).toBeGreaterThanOrEqual(0);
    await expect(figure.locator(".multiplane-plane")).toHaveCount(3);
  });

  test("a tilted or mirrored picture is drawn in 3D; the others keep their transform", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/stories/house/en.json", async (route) => {
      const response = await route.fetch();
      const bundle = await response.json();
      const block = bundle.scenes["matin-ville"].blocks.find(
        (item: { id?: string }) => item.id === "matin-ville.illustration",
      );
      Object.assign(block.illustration.layers[0], { tiltX: 20, tiltY: -30, flip: true });
      await route.fulfill({ response, json: bundle });
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Play an existing story", exact: true }).click();
    const figure = page.locator('[data-block="matin-ville.illustration"]').first();
    const transform = (role: string) =>
      figure
        .locator(`.multiplane-plane[data-role="${role}"] img`)
        .evaluate((image) => getComputedStyle(image).transform);
    await expect.poll(() => transform("foreground")).toMatch(/^matrix3d\(/);
    // Mirrored: the picture's x axis points left.
    expect(Number((await transform("foreground")).slice(9).split(",")[0])).toBeLessThan(0);
    expect(await transform("background")).toMatch(/^(none|matrix\()/);
  });

  test("camera and entrance presets preview their movement on hover or focus, still under reduced motion", async ({
    page,
  }) => {
    await page.goto("/editor");
    await expect(page.getByLabel("Ink script editor")).toBeVisible();
    await page.getByRole("tab", { name: "Media", exact: true }).click();
    await page.getByRole("button", { name: "Image", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Add Image", exact: true });
    await dialog.getByRole("button", { name: "Ready-made scenes", exact: true }).click();
    await dialog.getByRole("button", { name: "Character in forest", exact: true }).click();
    await dialog
      .locator(".image-section > summary")
      .filter({ hasText: /^Camera ·/ })
      .click();
    const camera = dialog.getByRole("group", { name: "Camera", exact: true });
    const cards = camera.getByRole("button");
    await expect(cards).toHaveCount(16);
    // Each card shows the current image (its main picture).
    const main = "sketch.misty-conifer-plain-001";
    const thumbnails = camera.locator(".preset-thumb img");
    await expect(thumbnails).toHaveCount(16);
    expect(await thumbnails.first().getAttribute("src")).toContain(main);
    const card = camera.getByRole("button", { name: "Sideways drift", exact: true });
    const moving = () => card.locator("img").evaluate((image) => image.getAnimations().length);
    // Hover plays the movement; leaving stops it.
    await card.hover();
    await expect.poll(moving).toBe(1);
    await dialog.getByRole("heading", { name: "Layers, front to back" }).hover();
    await expect.poll(moving).toBe(0);
    // Keyboard focus plays it too; choosing the card selects the preset.
    await card.focus();
    await expect.poll(moving).toBe(1);
    await card.press("Enter");
    await expect(card).toHaveAttribute("aria-pressed", "true");
    await card.blur();
    await expect.poll(moving).toBe(0);
    // Under reduced motion the thumbnails stay still.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await card.hover();
    await card.focus();
    expect(await moving()).toBe(0);
    // A single image's entrances are cards with the same preview.
    await page.emulateMedia({ reducedMotion: "no-preference" });
    for (const name of ["Remove Fern fronds", "Remove Curly-haired woman standing"])
      await dialog.getByRole("button", { name, exact: true }).click();
    await dialog
      .locator(".image-section > summary")
      .filter({ hasText: /^When to display the media/ })
      .click();
    const entrance = dialog.getByRole("group", { name: "Entrance", exact: true });
    await expect(entrance.getByRole("button")).toHaveText(["None", "Fade in", "Fade out"]);
    const fade = entrance.getByRole("button", { name: "Fade in", exact: true });
    await fade.hover();
    await expect
      .poll(() => fade.locator("img").evaluate((image) => image.getAnimations().length))
      .toBe(1);
  });
});

test.describe("Orée's images match their references", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "references are captured in Chromium");
  /**
   * Reference renders of Orée's six layered images, captured before the Image dialog was
   * rebuilt (Pass 9). Each must still look and save the same after every change to the dialog:
   * - the image in the editor's reader preview (pixels; Windows only, where they were captured);
   * - each layer in the dialog's preview (role, image, position, size, place in the frame);
   * - what is stored after opening the image and pressing Apply without changing anything.
   * Update on purpose: see REFACTOR_LOG.md, Pass 9, "2b".
   */
  const images = [
    ["matin-ville", "matin-ville.illustration"],
    ["livraison", "livraison.illustration"],
    ["chemin", "chemin.illustration"],
    ["passage", "passage.illustration"],
    ["cours-air", "cours-air.illustration"],
    ["bibliotheque", "bibliotheque.illustration"],
  ] as const;

  /**
   * Waits until every image of the area is drawn and the camera is still. A layer has no `src`
   * until its file is resolved (and cropped), and an `<img>` without one is `complete`, so each
   * image must have a source and real pixels, unchanged over a few frames, with no movement left.
   */
  const loaded = (area: Locator) =>
    area.evaluate(async (node) => {
      const frame = () => new Promise((done) => requestAnimationFrame(done));
      const images = () => [...node.querySelectorAll("img")];
      const moving = () =>
        node
          .getAnimations({ subtree: true })
          .some(
            (animation) =>
              animation.playState === "running" &&
              animation.effect?.getComputedTiming().iterations !== Infinity,
          );
      let drawn = "";
      for (let still = 0; still < 3;) {
        await frame();
        const list = images();
        const ready =
          list.length > 0 &&
          !moving() &&
          list.every((image) => image.currentSrc && image.complete && image.naturalWidth > 0);
        const now = ready ? list.map((image) => image.currentSrc).join("\n") : "";
        still = now && now === drawn ? still + 1 : 0;
        drawn = now;
      }
      await Promise.all(images().map((image) => image.decode()));
    });
  /** Each layer as the dialog draws it, independent of the preview's size. */
  const layers = (viewport: Locator) =>
    viewport.evaluate((view) => {
      const frame = view.getBoundingClientRect();
      const round = (value: number) => Math.round(value * 100) / 100;
      return {
        aspect: (view as HTMLElement).dataset.aspect,
        layers: [...view.querySelectorAll<HTMLElement>(".multiplane-plane")].map((plane) => {
          const image = plane.querySelector("img")!;
          const box = image.getBoundingClientRect();
          return {
            role: plane.dataset.role,
            image: plane.dataset.image,
            order: plane.style.zIndex,
            x: image.style.getPropertyValue("--layer-x"),
            y: image.style.getPropertyValue("--layer-y"),
            scale: image.style.getPropertyValue("--layer-scale"),
            rotation: image.style.getPropertyValue("--layer-rotation"),
            box: [
              (box.left - frame.left) / frame.width,
              (box.top - frame.top) / frame.height,
              box.width / frame.width,
              box.height / frame.height,
            ].map(round),
          };
        }),
      };
    });
  /**
   * Compares with a JSON reference by value (the formatter may lay the file out its own way);
   * `--update-snapshots` rewrites it.
   */
  async function matchesReference(name: string, value: unknown) {
    const info = test.info();
    info.snapshotSuffix = "";
    const file = info.snapshotPath(name);
    if (info.config.updateSnapshots === "all" || info.config.updateSnapshots === "changed")
      await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
    else expect(value).toEqual(JSON.parse(await readFile(file, "utf8")));
  }

  async function backup(page: Page) {
    await page.getByRole("button", { name: "Export", exact: true }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Complete project backup", exact: true }).click();
    const project = JSON.parse(await readFile((await (await download).path())!, "utf8"));
    await page
      .getByRole("dialog", { name: "Export project" })
      .getByRole("button", { name: "Close dialog" })
      .click();
    return project.project ?? project;
  }

  for (const [scene, id] of images)
    test(`${scene}: the layered image looks and saves the same`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/editor");
      await expect(page.locator(".preview-slot .prose")).toBeVisible({ timeout: 30_000 });
      // 1. The reader preview of this page.
      await caretTo(page, `# passage:${scene}`);
      await page.getByRole("button", { name: /^Preview from / }).click();
      const figure = page.locator(`.preview-slot [data-block="${id}"]`).first();
      await expect(figure).toBeVisible();
      await loaded(figure);
      // The cinematic image is only on screen while its movement plays: not a stable picture.
      if (process.platform === "win32" && scene !== "passage")
        await expect(figure).toHaveScreenshot(`${scene}-reader.png`, { maxDiffPixelRatio: 0.01 });
      // 2. The dialog's preview, layer by layer.
      await caretTo(page, `// @media ${scene}/${id}`);
      await page.getByRole("tab", { name: "Media", exact: true }).click();
      await page.getByRole("button", { name: "Edit Selected Media", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: /^Edit image$/i });
      const viewport = dialog.locator(".multiplane-viewport");
      await expect(viewport).toBeVisible();
      await loaded(viewport);
      await matchesReference(`${scene}-layers.json`, await layers(viewport));
      // 3. Apply without a change: nothing stored changes.
      await appliedUnchanged(page, scene);
    });

  /** Opens the image, presses Apply without a change, and compares what is stored. */
  async function appliedUnchanged(page: Page, scene: string) {
    const dialog = page.getByRole("dialog", { name: /^Edit image$/i });
    await dialog.getByRole("button", { name: /^Apply/ }).click();
    await expect(dialog).toHaveCount(0);
    const project = await backup(page);
    const stored = Object.fromEntries(
      Object.entries(
        project.languages as Record<string, { configuration: { scenes: Record<string, unknown> } }>,
      ).map(([locale, language]) => [locale, language.configuration.scenes[scene]]),
    );
    await matchesReference(`${scene}-stored.json`, stored);
  }

  /** Orée's single images: one examinable, two on the right page. Saved the same (no pixels). */
  const single = [
    ["messagere", "messagere.illustration"],
    ["chambre", "chambre.illustration"],
    ["relais", "relais.illustration"],
    ["air-test", "air-test.illustration"],
  ] as const;
  for (const [scene, id] of single)
    test(`${scene}: the single image saves the same`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/editor");
      await expect(page.locator(".preview-slot .prose")).toBeVisible({ timeout: 30_000 });
      await caretTo(page, `// @media ${scene}/${id}`);
      await page.getByRole("tab", { name: "Media", exact: true }).click();
      await page.getByRole("button", { name: "Edit Selected Media", exact: true }).click();
      await expect(page.getByRole("dialog", { name: /^Edit image$/i })).toBeVisible();
      await appliedUnchanged(page, scene);
    });
});
