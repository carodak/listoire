import { expect, test } from "./test.ts";
import { readFile } from "node:fs/promises";
import { browserHouseProject } from "../fixtures/house-project.ts";
import { StoryProjectSchema } from "../../src/contracts/editor-project.ts";
import { addIllustrationLibrary } from "../../src/features/editor/illustration-pack.ts";
import { compileProject } from "../../src/features/editor/compiler.ts";
import { illustrationDefaults } from "../../src/contracts/illustration.ts";
import { CinematicSchema } from "../../src/contracts/cinematic.ts";

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
test("crops pale borders, preserves full frames and limits the output size", async ({ page }) => {
  await page.goto("/");
  const sizes = await page.evaluate(async () => {
    const { cropImage } = await import("../../src/features/presentation/smart-crop.ts");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 3000;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "white";
    context.fillRect(0, 0, 3000, 3000);
    context.fillStyle = "black";
    context.fillRect(300, 300, 2400, 2400);
    const image = new Image();
    image.src = canvas.toDataURL();
    await image.decode();
    const blob = await cropImage(image);
    const cropped = await createImageBitmap(blob!);
    const size = [cropped.width, cropped.height];
    cropped.close();
    context.fillRect(0, 0, 3000, 3000);
    image.src = canvas.toDataURL();
    await image.decode();
    return { size, unchanged: (await cropImage(image)) === null };
  });
  expect(sizes).toEqual({ size: [2048, 2048], unchanged: true });
});
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
  for (const section of [/^Look on the page/, /^Camera settings/, /^Description & caption/])
    await dialog.locator(".image-section > summary").filter({ hasText: section }).click();
  await dialog.getByLabel("Text wrapping", { exact: true }).selectOption("right");
  await dialog.getByLabel("Camera", { exact: true }).selectOption("gentle-depth");
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
  await page.getByLabel("Search pictures", { exact: true }).fill("curly-haired-woman-standing-001");
  await dialog.locator('button[data-asset="sketch.curly-haired-woman-standing-001"]').click();
  await expect(dialog.getByLabel("More camera presets", { exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: "+ Add layer", exact: true }).click();
  await page.getByLabel("Search pictures", { exact: true }).fill("fern-fronds-001");
  await dialog.locator('button[data-asset$="fern-fronds-001"]').first().click();
  await expect(dialog.locator(".multiplane-plane")).toHaveCount(2);
  // The fern, just added, is the selected picture.
  await dialog.getByRole("button", { name: "Remove Fern fronds", exact: true }).click();
  for (const section of [/^When it appears/, /^Look on the page/])
    await dialog.locator(".image-section > summary").filter({ hasText: section }).click();
  await dialog.getByLabel("Entrance", { exact: true }).selectOption("none");
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
