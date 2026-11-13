import { expect, test } from "./test.ts";
import { resolve } from "node:path";
import { backup, findInInk, importProject, openHouseEditor, preview, script } from "./editor.ts";
import { clearStore } from "./idb.ts";

test("inserts images at their source position and preserves video uploads in complete backups", async ({
  page,
  browserName,
}) => {
  await openHouseEditor(page);
  await page.locator(".ace_text-input").focus();
  await expect(page.locator(".preview-slot .prose")).toBeVisible();
  await expect(page.locator(".ace_text-input")).toBeFocused();
  await findInInk(page, "The girl beside her looked exactly like you.");
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  await page.getByRole("button", { name: "Image", exact: true }).click();
  await page.getByRole("button", { name: "Choose an image", exact: true }).click();
  await page.getByLabel("Search pictures", { exact: true }).fill("house.night");
  await page.locator('.image-picker button[data-asset="house.night"]').click();
  // Pass 11: no "More options"; each settings category is its own folded section.
  for (const section of [
    /^Description & caption/,
    /^When to display the media/,
    /^Look on the page/,
    /^Interactivity/,
  ])
    await page.locator(".image-section > summary").filter({ hasText: section }).click();
  await page.getByLabel("Caption (shown under the image)").fill("After the girl");
  await page.getByRole("button", { name: "Wide", exact: true }).click();
  await page.getByLabel("Override default position", { exact: true }).check();
  await page.getByLabel("X (%)", { exact: true }).fill("5");
  await page.getByLabel("Y (%)", { exact: true }).fill("0");
  await expect(page.getByLabel("More camera presets", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "cinematic push in", exact: true })).toHaveCount(0);
  // Pass 11: the entrances are cards (with a moving preview), not a list.
  await page
    .getByRole("group", { name: "Entrance", exact: true })
    .getByRole("button", { name: "Fade in", exact: true })
    .click();
  await page.getByLabel("Media examinable", { exact: true }).check();
  await page
    .getByLabel("Image details (one per line)", { exact: true })
    .fill("The locked gate.\nA light upstairs.");
  await page
    .getByLabel("Text on the reverse (optional)", { exact: true })
    .fill("Do not tell her your name.");
  await page.getByRole("button", { name: "Apply Image", exact: true }).click();
  await preview(page);
  const figure = page
    .locator(".preview-slot figure")
    .filter({ has: page.getByText("After the girl", { exact: true }) });
  await expect(figure).toBeVisible();
  expect(await figure.evaluate((node) => node.previousElementSibling?.textContent)).toContain(
    "The girl beside her looked exactly like you.",
  );
  await expect(figure.locator(".atmosphere-none")).toBeVisible();
  await expect(figure.locator(".scene-illustration")).toHaveCSS("border-top-width", "0px");
  await page.getByRole("button", { name: "Examine the image", exact: true }).click();
  const examination = page.getByRole("dialog", { name: "Image", exact: true });
  await expect(examination).toContainText("The locked gate.");
  await examination.getByRole("button", { name: "Examine details", exact: true }).click();
  await expect(examination).toContainText("A light upstairs.");
  await examination.getByRole("button", { name: "Turn over", exact: true }).click();
  await expect(examination.locator(".photo-reverse")).toContainText("Do not tell her your name.");
  await examination.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Video", exact: true }).click();
  await page
    .getByLabel("Video permission / rights", { exact: true })
    .fill("Owned synthetic black-frame test fixture.");
  if (browserName === "webkit")
    await page
      .getByLabel("Video duration in seconds (optional override)", { exact: true })
      .fill("1");
  await page
    .getByLabel("Video file (MP4 / WebM, max 50 MB)", { exact: true })
    .setInputFiles(resolve("tests/fixtures/editor-video.mp4"));
  await expect(page.getByRole("dialog").locator("video")).toBeVisible();
  await page.getByRole("button", { name: "Apply Video", exact: true }).click();
  await preview(page);
  await expect(page.locator(".preview-slot video")).toBeVisible();
  const saved = await backup(page);
  expect(Object.values(saved.uploadedFiles)[0]).toMatch(/^data:video\/mp4;base64,/);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: "Close preview", exact: true }).click();
  // Without its stored upload, the backup alone brings the video back.
  await clearStore(page, "media");
  await importProject(page, saved, "restored-project.json");
  await preview(page);
  const restoredVideo = page.locator(".preview-slot video");
  await expect(restoredVideo).toBeVisible();
  if (browserName !== "webkit") {
    await restoredVideo.evaluate(async (video: HTMLVideoElement) => {
      await video.play();
    });
    await expect
      .poll(() => restoredVideo.evaluate((video: HTMLVideoElement) => video.currentTime))
      .toBeGreaterThan(0);
  }
});

test("keeps photograph magnification calibrated and restores focus after Escape", async ({
  page,
}) => {
  await openHouseEditor(page);
  const trigger = page.getByRole("button", { name: "Examine the photograph", exact: true });
  await trigger.click();
  const photo = page.locator(".photo-dialog .magnified-image");
  await photo.focus();
  await expect(page.locator(".magnifier-lens")).toHaveAttribute("data-x", "0.500");
  await photo.press("ArrowRight");
  await expect(page.locator(".magnifier-lens")).toHaveAttribute("data-x", "0.530");
  await photo.press("Home");
  await expect(page.locator(".magnifier-lens")).toHaveAttribute("data-x", "0.500");
  await photo.press("Escape");
  await expect(page.locator(".photo-dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("opens media from its selected Ink reference and reports lines without a reference", async ({
  page,
}) => {
  await openHouseEditor(page);
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  await page.getByRole("button", { name: "Edit Selected Media", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Validation issues", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await findInInk(page, "// @media intro/intro.illustration");
  await page.getByRole("button", { name: "Edit Selected Media", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Edit Image", exact: true })).toBeVisible();
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
  await expect.poll(() => script(page)).not.toContain(line);
  await expect(image).toHaveCount(0);
  if (browserName === "webkit")
    // WebKit for Windows hands Ace 1.2.6 an empty paste (a plain textarea pastes fine): paste
    // through Ace's own entry point. Real Safari paste is on the by-hand list.
    await page.locator(".ink-editor").evaluate((node, text) => {
      (node as unknown as { env: { editor: { onPaste(text: string): void } } }).env.editor.onPaste(
        text,
      );
    }, `${line}\n`);
  else await input.press("Control+v");
  await expect.poll(() => script(page)).toContain(line);
  await expect(image).toBeVisible();
  await expect(image.locator(".multiplane-plane")).toHaveCount(planes);
  // Its settings came back too: the dialog opens it as an existing image.
  await input.press("ArrowUp");
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  await page.getByRole("button", { name: "Edit Selected Media", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Edit Image", exact: true })).toBeVisible();
});
