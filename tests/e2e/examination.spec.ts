import { expect, test } from "./test.ts";
import { withFixtureStory } from "./fixture-story.ts";
import {
  editBundle,
  enterReader,
  next,
  onPage,
  openOree,
  playStory,
  readTo,
  withExaminationReverse,
} from "./oree.ts";

test("examination: under its image, zoom, lens by pointer and keys, reverse, details, focus", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await withExaminationReverse(page, "Do not tell her your name.");
  await openOree(page);
  await readTo(page, "messagere");
  const examine = page.getByRole("button", { name: "Examine Nour", exact: true });
  // Examine sits directly under its image.
  const picture = (await page
    .locator('[data-examinable="true"] > .scene-illustration')
    .boundingBox())!;
  expect((await examine.boundingBox())!.y - picture.y - picture.height).toBeCloseTo(0, 0);
  await examine.click();
  const viewer = page.getByRole("dialog", { name: "Nour", exact: true });
  const window = viewer.locator(".photo-window");
  const surface = viewer.locator(".magnified-image");
  const image = surface.locator(":scope > img");
  const lens = viewer.locator(".magnifier-lens");
  await expect(image).toHaveJSProperty("complete", true);
  await expect(viewer.getByRole("button", { name: /Reset view/ })).toHaveCount(0);
  await expect(
    viewer.getByRole("button", { name: "Examine details", exact: true }).locator("svg"),
  ).toBeVisible();
  const before = (await viewer.boundingBox())!;
  const area = (await window.boundingBox())!;
  await surface.hover();
  await expect(lens).toBeVisible();
  // Zoom keeps the dimensions and grows from the centre.
  await viewer.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(surface).toHaveCSS("transform", "matrix(1.5, 0, 0, 1.5, 0, 0)");
  const zoomed = (await surface.boundingBox())!;
  expect(zoomed.x + zoomed.width / 2).toBeCloseTo(area.x + area.width / 2, 0);
  await page.screenshot({ path: info.outputPath("examination.png") });
  // The lens samples a touch pointer's coordinates; the keys move it and Home recentres it.
  const bounds = (await image.boundingBox())!;
  await surface.dispatchEvent("pointermove", {
    pointerId: 1,
    pointerType: "touch",
    clientX: bounds.x + bounds.width * 0.25,
    clientY: bounds.y + bounds.height * 0.75,
  });
  await expect(lens).toHaveAttribute("data-x", "0.250");
  await expect(lens).toHaveAttribute("data-y", "0.750");
  await surface.focus();
  await page.keyboard.press("ArrowRight");
  await expect(lens).toHaveAttribute("data-x", "0.280");
  await page.keyboard.press("Home");
  await expect(lens).toHaveAttribute("data-x", "0.500");
  await expect(image).toHaveCSS("transform", "none");
  // Turning over shows the handwriting on the reverse, at the same size.
  await viewer.getByRole("button", { name: "Turn over", exact: true }).click();
  const reverse = viewer.locator(".photo-reverse");
  await expect(reverse).toHaveAttribute("data-writing", "true");
  await expect(reverse).toContainText("do not tell her your name", { ignoreCase: true });
  await expect(reverse.locator("text").first()).toHaveAttribute("fill", "white");
  const after = (await viewer.boundingBox())!;
  expect(after.width).toBeCloseTo(before.width, 0);
  expect(after.height).toBeCloseTo(before.height, 0);
  expect((await window.boundingBox())!.height).toBeCloseTo(area.height, 0);
  await expect(viewer.locator(".photo-caption")).not.toContainText("do not tell her your name", {
    ignoreCase: true,
  });
  if (["chromium", "mobile"].includes(info.project.name))
    await page.screenshot({ path: info.outputPath("photograph-reverse.png"), fullPage: true });
  // Turning back resets the view (the separate "Reset view" control was removed).
  await viewer.getByRole("button", { name: "Turn over", exact: true }).click();
  await expect(lens).toHaveCount(0);
  await viewer.getByRole("button", { name: "Examine details", exact: true }).click();
  await expect(viewer.locator(".photo-caption")).toContainText("travelling coat");
  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
  await expect(examine).toBeFocused();
});

// Its own test: browser coverage keeps only the scripts of the page loaded last.
test("examination starts again from its first detail after a reload", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openOree(page);
  await readTo(page, "messagere");
  const examine = page.getByRole("button", { name: "Examine Nour", exact: true });
  const viewer = page.getByRole("dialog", { name: "Nour", exact: true });
  await examine.click();
  await viewer.getByRole("button", { name: "Examine details", exact: true }).click();
  await expect(viewer.locator(".photo-caption")).toContainText("travelling coat");
  await page.keyboard.press("Escape");
  await page.reload();
  await playStory(page);
  await onPage(page, "messagere");
  await examine.click();
  await expect(viewer.locator(".photo-caption")).toContainText("admissions letter");
});

test("shows a cropped illustration once at its final size and removes the lower fade before Examine", async ({
  page,
}) => {
  await editBundle(page, (bundle) => {
    const block = bundle.scenes.messagere.blocks.find(
      (block: { kind: string }) => block.kind === "media",
    );
    block.illustration = {
      base: { role: "midground", x: 0, y: 0, scale: 1 },
      layers: [],
      aspect: "portrait",
      blend: "paper",
      wrap: "none",
      autoCrop: true,
    };
  });
  await enterReader(page);
  await next(page);
  const stage = page.locator('[data-examinable="true"] .scene-illustration');
  await expect(stage).toHaveCSS("mask-image", "none");
  const drawing = stage.locator(".shot-plane-image");
  await expect(drawing).toHaveAttribute("src", /^blob:/);
  await expect
    .poll(() => drawing.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  const source = await drawing.getAttribute("src");
  const first = (await drawing.boundingBox())!;
  await page.waitForTimeout(500);
  expect(await drawing.getAttribute("src")).toBe(source);
  const final = (await drawing.boundingBox())!;
  for (const key of ["x", "y", "width", "height"] as const)
    expect(final[key]).toBeCloseTo(first[key], 1);
  const examine = page.getByRole("button", { name: "Examine Nour" });
  const button = (await examine.boundingBox())!;
  const image = (await stage.boundingBox())!;
  expect(button.y - image.y - image.height).toBeCloseTo(0, 0);
  // Without a reverse side there is nothing to turn over.
  await examine.click();
  const dialog = page.getByRole("dialog", { name: "Nour", exact: true });
  await expect(dialog.getByRole("button", { name: "Turn over", exact: true })).toHaveCount(0);
});

test("a photograph detail runs a hidden story action whose clue survives reload", async ({
  page,
  isMobile,
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
  // On a phone the panel covers the page: close it first, as a reader would.
  if (isMobile) await page.keyboard.press("Escape");
  await examine.click();
  await expect(
    page.getByRole("button", { name: "Inspect the photograph detail", exact: true }),
  ).toHaveCount(0);
});
