import { expect, test } from "./test.ts";
import { backup } from "./editor.ts";
import {
  character,
  misty,
  openNewImage,
  openSection,
  pick,
  plane,
  readyMade,
} from "./image-editor.ts";

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
  const camera = dialog.locator(".image-section > summary").filter({ hasText: /^Camera/ });
  await expect(camera).toHaveCount(0);
  // Pass 11: the settings are folded sections, all closed (no "More options").
  await expect(dialog.locator(".image-section")).not.toHaveCount(0);
  await expect(dialog.locator(".image-section[open]")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Apply Image", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Select a licensed image.");
  // One way to choose: the start area's own button (Pass 11; nothing in the layers).
  await expect(dialog.getByRole("button", { name: /^Choose/ })).toHaveCount(1);
  const start = dialog.getByRole("region", { name: "Start with an image" });
  await start.getByRole("button", { name: "Choose an image", exact: true }).click();
  await pick(dialog, "Choose an image", misty);
  await expect(image).toContainText("Misty conifer plain");
  // A single image has no camera and no depth.
  await expect(camera).toHaveCount(0);
  await expect(dialog.getByLabel("Depth", { exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "+ Add layer", exact: true })).toBeEnabled();
  // Pass 11: no "Choose" once there is an image; the selected image's "Replace image" changes it.
  await expect(dialog.getByRole("button", { name: /^(Choose|Change)/ })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: /^Replace/ })).toHaveCount(1);
  await dialog.getByRole("button", { name: "Apply Image", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  // Stored like every single image: the image, no layers.
  const saved = await backup(page);
  const blocks = Object.values(
    saved.languages.en.configuration.scenes as Record<
      string,
      { blocks?: { image?: string; illustration?: { layers: unknown[] } }[] }
    >,
  ).flatMap((scene) => scene.blocks ?? []);
  const block = blocks.find((item) => item.image === misty && item.illustration)!;
  expect(block.illustration!.layers).toEqual([]);
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
  for (const scene of ["Landscape", "Character in forest", "Two moons"])
    await expect(scenes.getByRole("button", { name: scene, exact: true })).toBeVisible();
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
  const filter = (name: string) => filters.getByRole("button", { name, exact: true });
  await expect(filters.getByRole("button")).toHaveText([
    "All",
    "Foreground",
    "Middleground",
    "Background",
  ]);
  await expect(filter("All")).toHaveAttribute("aria-pressed", "true");
  const asset = (id: string) => panel.locator(`button[data-asset="${id}"]`);
  // In this story: the fern the story already uses, not the library's misty plain.
  const fern = "sketch.fern-fronds-001";
  await expect(asset(fern)).toBeVisible();
  await expect(asset(misty)).toHaveCount(0);
  await filter("Background").click();
  await expect(asset(fern)).toHaveCount(0);
  await filter("Foreground").click();
  await expect(asset(fern)).toBeVisible();
  // Library: pictures the story doesn't use yet, with the same filters.
  await library.click();
  await expect(library).toHaveAttribute("aria-selected", "true");
  await expect(asset(misty)).toHaveCount(0);
  await filter("Background").click();
  await expect(asset(misty)).toBeVisible();
  await expect(asset(fern)).toHaveCount(0);
  // A long list scrolls; its cards keep their full thumbnail and name.
  await filter("All").click();
  const first = panel.locator("button[data-asset]").first();
  expect((await first.locator("img").boundingBox())!.height).toBeGreaterThan(60);
  await expect(first.locator("span")).toBeVisible();
  await filter("Background").click();
  await filter("All").click();
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

test("settings: folded sections in order, closed, with summaries; camera settings under the presets", async ({
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
  // No "More options": each category is its own section, in this order, all closed.
  await expect(dialog.getByText("More options")).toHaveCount(0);
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
  // The camera folds too; inside, its settings come right after the presets, folded.
  const camera = sections.nth(1);
  await openSection(dialog, "Camera");
  // The presets keep their name for screen readers, without repeating the title on screen.
  const presets = camera.getByRole("group", { name: "Camera", exact: true });
  await expect(presets).toBeVisible();
  expect(
    await camera.locator(".preset-cards > legend").evaluate((legend) => legend.clientWidth),
  ).toBeLessThanOrEqual(1);
  const next = await presets.evaluate(
    (group) => group.nextElementSibling?.querySelector("summary")?.textContent,
  );
  expect(next).toMatch(/^Camera settings/);
  await camera.getByRole("button", { name: "Gentle depth", exact: true }).click();
  await expect(camera.locator("> summary")).toHaveText("Camera · Gentle depth");
  await expect(settings.locator("summary")).toHaveText("Camera settings");
  await expect(settings).not.toHaveAttribute("open");
  // A closed section says what is set inside it.
  await openSection(dialog, "Camera settings");
  const duration = dialog.getByLabel("Movement duration (seconds)", { exact: true });
  await expect(duration).toBeVisible();
  await duration.fill("7");
  await openSection(dialog, "Camera settings");
  await expect(settings.locator("summary")).toContainText("set: changed");
});

test("Description & caption: each label says where its text goes", async ({ page }) => {
  const dialog = await openNewImage(page);
  await dialog.getByRole("button", { name: "Choose an image", exact: true }).click();
  await pick(dialog, "Choose an image", misty);
  await expect(dialog.locator(".image-section > summary").filter({ hasText: /^Text/ })).toHaveCount(
    0,
  );
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
  const summary = dialog.locator(".image-section > summary").filter({ hasText: /^Interactivity/ });
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

test("camera and entrance presets preview their movement on hover or focus, still under reduced motion", async ({
  page,
}) => {
  const dialog = await openNewImage(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await readyMade(dialog, "Character in forest");
  await openSection(dialog, "Camera");
  const camera = dialog.getByRole("group", { name: "Camera", exact: true });
  const cards = camera.getByRole("button");
  await expect(cards).toHaveCount(16);
  // Each card shows the current image (its main picture).
  const thumbnails = camera.locator(".preset-thumb img");
  await expect(thumbnails).toHaveCount(16);
  expect(await thumbnails.first().getAttribute("src")).toContain(misty);
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
  await openSection(dialog, "When to display the media");
  const entrance = dialog.getByRole("group", { name: "Entrance", exact: true });
  await expect(entrance.getByRole("button")).toHaveText(["None", "Fade in", "Fade out"]);
  const fade = entrance.getByRole("button", { name: "Fade in", exact: true });
  await fade.hover();
  await expect
    .poll(() => fade.locator("img").evaluate((image) => image.getAnimations().length))
    .toBe(1);
});
