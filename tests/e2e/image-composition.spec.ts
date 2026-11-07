import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("composes gallery layers, crops and wraps them, then restores a complete project backup", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/editor");
  await expect(page.getByLabel("Ink script editor")).toBeVisible();
  await page
    .getByLabel("Find in Ink", { exact: true })
    .fill("The girl beside her looked exactly like you.");
  await page.getByLabel("Find in Ink", { exact: true }).press("Enter");
  await page.getByLabel("Close search", { exact: true }).click();
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  await page.getByRole("button", { name: "Image", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add Image", exact: true });
  await dialog.getByLabel("Illustration mode", { exact: true }).selectOption("layered");
  await dialog.getByRole("button", { name: "Character in forest", exact: true }).click();
  await expect(dialog.locator(".multiplane-plane")).toHaveCount(3);
  await dialog.getByRole("button", { name: "+ foreground", exact: true }).click();
  const library = page.getByRole("region", { name: "Media library", exact: true });
  await library.getByLabel("Search media", { exact: true }).fill("foreground-tree-forest-3");
  await library.getByRole("button", { name: "Use this media", exact: true }).click();
  await dialog.getByLabel("Image scale", { exact: true }).press("ArrowRight");
  await dialog.getByLabel("Image scale", { exact: true }).press("ArrowRight");
  await dialog.getByLabel("Show crop / safe margins", { exact: true }).check();
  await expect(dialog.locator(".image-safe-margin")).toBeVisible();
  await dialog.getByLabel("Text wrapping", { exact: true }).selectOption("right");
  await dialog.getByRole("button", { name: "gentle depth", exact: true }).click();
  await dialog.getByLabel("Movement duration (seconds)", { exact: true }).fill("6.5");
  await dialog.getByLabel("Caption", { exact: true }).fill("Layered forest test");
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
  await dialog.getByRole("button", { name: /Browse media library/ }).click();
  await page
    .getByLabel("Search media", { exact: true })
    .fill("paper.modern-male-character-reading");
  await page.getByRole("button", { name: "Use this media", exact: true }).click();
  await expect(dialog.getByLabel("More camera presets", { exact: true })).toHaveCount(0);
  await dialog.getByLabel("Illustration mode", { exact: true }).selectOption("layered");
  await dialog.getByRole("button", { name: "+ foreground", exact: true }).click();
  await page.getByLabel("Search media", { exact: true }).fill("foreground-tree");
  await page.getByRole("button", { name: "Use this media", exact: true }).first().click();
  await expect(dialog.locator(".multiplane-plane")).toHaveCount(2);
  await dialog.getByLabel("Remove foreground layer 1", { exact: true }).click();
  await dialog.getByRole("button", { name: "none", exact: true }).click();
  await dialog.getByLabel("Text wrapping", { exact: true }).selectOption("left");
  await dialog.getByRole("button", { name: "Apply Image", exact: true }).click();
  await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
  const figure = page.locator('.preview-slot figure[data-wrap="left"]');
  await expect(figure).toBeVisible();
  await expect(figure).toHaveCSS(
    "shape-outside",
    /url\(.*paper\.modern-male-character-reading\.webp/,
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
    const bundle = await (await route.fetch()).json();
    const scene = bundle.scenes.intro;
    const artwork = scene.blocks.find((block: { id: string }) => block.id === "intro.artwork");
    const inline = scene.blocks.find((block: { id: string }) => block.id === "intro.paper");
    artwork.image = inline.image;
    artwork.illustration = structuredClone(inline.illustration);
    artwork.illustration.layers.push({
      image: "paper.modern-male-character",
      role: "midground",
      x: 15,
      y: 0,
      scale: 0.9,
    });
    artwork.motion = inline.motion;
    scene.events.push({
      ...scene.events.find((event: { blockId: string }) => event.blockId === "intro.paper"),
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
