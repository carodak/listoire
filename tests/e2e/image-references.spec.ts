import { expect, test } from "./test.ts";
import type { Locator, Page } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";

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

test.skip(({ browserName }) => browserName !== "chromium", "references are captured in Chromium");

type Ace = {
  getValue(): string;
  clearSelection(): void;
  gotoLine(row: number, column: number): void;
  focus(): void;
};
/** Puts the script's caret at the start of the first line that contains `text`. */
async function caretTo(page: Page, prefix: string) {
  await page.locator(".ink-editor").evaluate((node, text) => {
    const editor = (node as unknown as { env: { editor: Ace } }).env.editor;
    const row = editor
      .getValue()
      .split("\n")
      .findIndex((line) => line.includes(text));
    if (row < 0) throw new Error(`No line contains ${text}`);
    editor.clearSelection();
    editor.gotoLine(row + 1, 0);
    editor.focus();
  }, prefix);
}
const loaded = (area: Locator) =>
  area
    .locator("img")
    .evaluateAll((images) =>
      Promise.all(
        (images as HTMLImageElement[]).map((image) =>
          image.complete
            ? image.decode().catch(() => {})
            : new Promise((done) => (image.onload = image.onerror = done)),
        ),
      ),
    );
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
    await dialog.getByRole("button", { name: /^Apply/ }).click();
    await expect(dialog).toHaveCount(0);
    const project = await backup(page);
    const stored = Object.fromEntries(
      Object.entries(
        project.languages as Record<string, { configuration: { scenes: Record<string, unknown> } }>,
      ).map(([locale, language]) => [locale, language.configuration.scenes[scene]]),
    );
    await matchesReference(`${scene}-stored.json`, stored);
  });
