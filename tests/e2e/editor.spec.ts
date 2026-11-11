import { expect, test } from "./test.ts";
import type { Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { browserHouseProject } from "../fixtures/house-project.ts";

test.beforeEach(async ({ page }) => {
  await page.route("**/stories/house/project.json", (route) =>
    route.fulfill({ json: browserHouseProject }),
  );
});

async function openEditor(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/editor");
  await expect(page.getByLabel("Ink script editor")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".ace_text-input")).toHaveCount(1);
  await expect(page.getByLabel("Story title", { exact: true })).toHaveValue(
    "The House That Remembered",
  );
}
async function appendInk(page: Page, text: string) {
  await page.locator(".ace_text-input").focus();
  await page.keyboard.press("Control+End");
  await page.keyboard.insertText(text);
}

test("synchronizes story.json after deleting Ink scenes and retains it after reload", async ({
  page,
}) => {
  await openEditor(page);
  const script = "-> start\n=== start ===\nA new beginning. # segment:start.one\n-> END";
  await page.locator(".ace_text-input").focus();
  await page.keyboard.press("Control+Home");
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(script);
  const properties = async () => {
    await page.getByRole("button", { name: "⚙ story.json", exact: true }).click();
    const value = JSON.parse(
      await page.getByLabel("Properties JSON", { exact: true }).inputValue(),
    );
    await page.keyboard.press("Escape");
    return value;
  };
  expect((await properties()).scenes).toEqual({});
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect((await properties()).scenes.intro).toBeDefined();
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  expect((await properties()).scenes).toEqual({});
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByText("Draft saved · fix issues to update the reader", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Ink script editor")).toBeVisible();
  expect((await properties()).scenes).toEqual({});
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Complete project backup", exact: true }).click();
  const backup = JSON.parse(await readFile((await (await download).path())!, "utf8"));
  expect(backup.languages.en.configuration.scenes).toEqual({});
  expect(backup.languages.en.script).not.toContain("@media intro/");
});

test("opens media from its selected Ink reference and reports lines without a reference", async ({
  page,
}) => {
  await openEditor(page);
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  await page.getByRole("button", { name: "Edit Selected Media", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Validation issues", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByLabel("Find in Ink", { exact: true }).fill("// @media intro/intro.illustration");
  await page.getByLabel("Find in Ink", { exact: true }).press("Enter");
  await page.getByLabel("Close search", { exact: true }).click();
  await page.getByRole("button", { name: "Edit Selected Media", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Edit Image", exact: true })).toBeVisible();
});

test("keeps photograph magnification calibrated and restores focus after Escape", async ({
  page,
}) => {
  await openEditor(page);
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

test("refreshes an imported legacy project's artwork without losing the author's text", async ({
  page,
}) => {
  await openEditor(page);
  const legacy = JSON.parse(
    await readFile(resolve("docs/story-editor/original-project.json"), "utf8"),
  );
  legacy.languages.en.configuration.title = "My retained story";
  legacy.languages.en.script += "\n// My retained draft note\n";
  await page.getByRole("button", { name: "Load / Import", exact: true }).click();
  await page.locator('input[type=file][accept=".ink,.json"]').setInputFiles({
    name: "old-project.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(legacy)),
  });
  await expect(page.getByLabel("Story title", { exact: true })).toHaveValue("My retained story");
  await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
  await expect(page.locator(".preview-slot .story-art .shot-plane-image")).toHaveAttribute(
    "src",
    /paper\.modern-male-character\.webp$/,
  );
  await expect(page.locator(".preview-slot .scene-illustration img").first()).toHaveAttribute(
    "src",
    /house\.night\.webp$/,
  );
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Complete project backup", exact: true }).click();
  const backup = JSON.parse(await readFile((await (await download).path())!, "utf8"));
  expect(backup.languages.en.script).toContain("My retained draft note");
  expect(backup.languages.en.configuration.title).toBe("My retained story");
});

test("inserts images at their source position and preserves video uploads in complete backups", async ({
  page,
  browserName,
}) => {
  await openEditor(page);
  await page.locator(".ace_text-input").focus();
  await expect(page.locator(".preview-slot .prose")).toBeVisible();
  await expect(page.locator(".ace_text-input")).toBeFocused();
  await page
    .getByLabel("Find in Ink", { exact: true })
    .fill("The girl beside her looked exactly like you.");
  await page.getByLabel("Find in Ink", { exact: true }).press("Enter");
  await page.getByLabel("Close search", { exact: true }).click();
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  await page.getByRole("button", { name: "Image", exact: true }).click();
  await page.getByRole("button", { name: "Choose an image", exact: true }).click();
  await page.getByLabel("Search pictures", { exact: true }).fill("house.night");
  await page.locator('.image-picker button[data-asset="house.night"]').click();
  // Pass 11: no "More options"; each settings category is its own folded section.
  for (const section of [/^Description & caption/, /^When it appears/, /^Look on the page/])
    await page.locator(".image-section > summary").filter({ hasText: section }).click();
  await page.getByLabel("Caption (shown under the image)").fill("After the girl");
  await page.getByRole("button", { name: "Wide", exact: true }).click();
  await page.getByLabel("Override default position", { exact: true }).check();
  await page.getByLabel("X (%)", { exact: true }).fill("5");
  await page.getByLabel("Y (%)", { exact: true }).fill("0");
  await expect(page.getByLabel("More camera presets", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "cinematic push in", exact: true })).toHaveCount(0);
  await page.getByRole("combobox", { name: "Entrance", exact: true }).selectOption("fade-in");
  await page.getByLabel("Media examinable", { exact: true }).check();
  await page
    .getByLabel("Image details (one per line)", { exact: true })
    .fill("The locked gate.\nA light upstairs.");
  await page
    .getByLabel("Text on the reverse (optional)", { exact: true })
    .fill("Do not tell her your name.");
  await page.getByRole("button", { name: "Apply Image", exact: true }).click();
  await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
  await expect(page.getByRole("button", { name: "▷ Preview", exact: true })).toBeEnabled();
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
  await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
  await expect(page.getByRole("button", { name: "▷ Preview", exact: true })).toBeEnabled();
  await expect(page.locator(".preview-slot video")).toBeVisible();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Complete project backup", exact: true }).click();
  const backup = JSON.parse(await readFile((await (await download).path())!, "utf8"));
  expect(Object.values(backup.uploadedFiles)[0]).toMatch(/^data:video\/mp4;base64,/);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: "Close preview", exact: true }).click();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("listoire-media");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction("files", "readwrite");
          transaction.objectStore("files").clear();
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
  );
  await page.getByRole("button", { name: "Load / Import", exact: true }).click();
  await page.locator('input[type=file][accept=".ink,.json"]').setInputFiles({
    name: "restored-project.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
  await expect(page.getByRole("button", { name: "▷ Preview", exact: true })).toBeEnabled();
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

test("saves custom voice profiles and sends the selected synthesis parameters to local preview", async ({
  page,
  browserName,
}) => {
  await openEditor(page);
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  await page.getByRole("button", { name: "TTS", exact: true }).click();
  await page.getByLabel("AI model", { exact: true }).selectOption("multilingual-v3");
  await page.getByLabel("Pitch (semitones)", { exact: true }).fill("3");
  await page.getByLabel("Variation / temperature", { exact: true }).fill("1.1");
  await page.getByText("Add a voice from an example", { exact: true }).click();
  await page.getByLabel("Voice name", { exact: true }).fill("Example voice");
  await page
    .getByLabel("Permission / recording rights", { exact: true })
    .fill("Synthetic test WAV, no human speaker.");
  const wav = Buffer.alloc(288044);
  wav.write("RIFF");
  wav.writeUInt32LE(288036, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(24000, 24);
  wav.writeUInt32LE(48000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(288000, 40);
  if (browserName === "webkit")
    await page
      .getByLabel("Example duration in seconds (optional override)", { exact: true })
      .fill("6");
  await page
    .getByLabel("Voice example (MP3 / WAV, max 5 MB)", { exact: true })
    .setInputFiles({ name: "example.wav", mimeType: "audio/wav", buffer: wav });
  await expect(page.getByLabel("Voice", { exact: true }).locator("option:checked")).toHaveText(
    "Example voice",
  );
  const request = page.waitForRequest((request) =>
    request.url().endsWith("/api/narration/editor-preview"),
  );
  await page.route("**/api/narration/editor-preview", (route) =>
    route.fulfill({ status: 503, body: "{}", contentType: "application/json" }),
  );
  await page.getByLabel("Narration mode", { exact: true }).selectOption("ai-live");
  await page
    .getByRole("combobox", { name: "Narrative segment", exact: true })
    .selectOption("intro.p1");
  await page.getByRole("button", { name: "Generate / preview audio", exact: true }).click();
  const payload = (await request).postDataJSON();
  expect(payload.settings).toMatchObject({ pitch: 3, temperature: 1.1 });
  expect(payload.profile).toMatchObject({
    label: "Example voice",
    model: "multilingual-v3",
    reference: { rights: "Synthetic test WAV, no human speaker." },
  });
  expect(payload.voiceId).toBe(payload.profile.id);
  expect(payload.settingsKey).toMatch(/^[a-f0-9]{64}$/);
  await page.getByRole("button", { name: "Apply narration", exact: true }).click();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Complete project backup", exact: true }).click();
  const backup = JSON.parse(await readFile((await (await download).path())!, "utf8"));
  expect(backup.languages.en.configuration.voiceProfiles).toContainEqual(
    expect.objectContaining({ label: "Example voice" }),
  );
  expect(backup.languages.en.configuration.speechSettings.pitch).toBe(3);
});

test("search, sidebar media highlighting, compatible animations and docked preview", async ({
  page,
}) => {
  await openEditor(page);
  await expect(page.locator(".preview-slot .prose")).toBeVisible();
  await expect(page.locator(".preview-header button")).toHaveCount(2);
  await expect(
    page.locator(".preview-slot").getByRole("button", { name: "Previous page", exact: true }),
  ).toHaveCount(0);
  const language = page.getByLabel("Story language", { exact: true });
  await expect(language.locator("option:checked")).toHaveText("EN");
  expect((await language.boundingBox())!.width).toBeLessThan(75);
  await expect(page.getByRole("button", { name: "Fullscreen preview", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Fullscreen preview", exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator(".experience-preview")
        .evaluate(
          (node) =>
            document.fullscreenElement === node || node.getAttribute("data-window") === "maximized",
        ),
    )
    .toBe(true);
  if (await page.evaluate(() => Boolean(document.fullscreenElement)))
    await page.evaluate(() => document.exitFullscreen());
  else await page.getByRole("button", { name: "Fullscreen preview", exact: true }).click();
  if ((page.viewportSize()?.width ?? 0) > 1000) {
    await page
      .getByRole("separator", { name: "Resize navigation", exact: true })
      .press("ArrowRight");
    await expect(
      page.getByRole("separator", { name: "Resize navigation", exact: true }),
    ).toHaveAttribute("aria-valuenow", "239");
  }
  await expect(
    page.getByLabel("Story language", { exact: true }).locator("option").last(),
  ).toHaveText("+ Add Language…");
  await expect(page.locator(".project-files [aria-current=page]")).toContainText("en.ink");
  await page.getByLabel("Find in Ink", { exact: true }).fill("photograph");
  await page.getByLabel("Find in Ink", { exact: true }).press("Enter");
  await expect(page.locator(".ace_search_form input")).toHaveValue("photograph");
  await expect(page.locator(".ace_replace_form")).toBeHidden();
  await page.getByRole("button", { name: "Or find and replace…", exact: true }).click();
  await expect(page.locator(".ace_replace_form")).toBeVisible();
  await expect(page.getByLabel("Close search", { exact: true })).toHaveText("×");
  await page.getByLabel("Close search", { exact: true }).click();
  await page.getByRole("tab", { name: "Story Outline", exact: true }).click();
  await page
    .locator(".editor-outline")
    .getByRole("button", { name: /intro.*Knot/ })
    .click();
  await page.getByRole("tab", { name: "Scene Media", exact: true }).click();
  await page.locator(".editor-outline button").filter({ hasText: "intro.illustration" }).hover();
  await expect(page.locator(".editor-media-highlight")).toHaveCount(1);
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  await page.getByRole("button", { name: "Animation", exact: true }).click();
  await page.getByLabel("Target", { exact: true }).selectOption("intro.illustration");
  await expect(
    page.getByLabel("Animation", { exact: true }).locator('option[value="fog-overlay"]'),
  ).toHaveCount(0);
  await page.getByLabel("Target", { exact: true }).selectOption("page");
  await expect(page.getByLabel("Animation", { exact: true }).locator("option")).toContainText([
    "fade-in",
    "fade-out",
    "screen-shake",
    "light-flicker",
    "rain-overlay",
    "fog-overlay",
  ]);
  await page.getByLabel("Target", { exact: true }).selectOption("transition");
  await expect(page.getByLabel("Animation", { exact: true }).locator("option")).toHaveCount(1);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Chapter", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
  await expect(page.getByRole("button", { name: "▷ Preview", exact: true })).toBeEnabled();
  await expect(page.locator(".preview-slot .prose")).toContainText("The first time");
  await page.getByRole("button", { name: "Continue reading", exact: true }).click();
  await expect(page.locator(".preview-slot .prose")).toContainText("On the back");
  await appendInk(page, "\n// Editing beside the preview\n");
  await expect(page.locator(".preview-slot .prose")).toContainText("On the back");
  await page.getByRole("button", { name: "Close preview", exact: true }).click();
  await expect(page.locator(".preview-slot")).toHaveCount(0);
});

test("edits both languages, undoes metadata, publishes a title and previews the actual reader", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openEditor(page);
  await expect(page.getByRole("tab", { name: "Story", exact: true })).toBeVisible();
  await appendInk(page, "\n// Author note in English\n");
  await page.getByLabel("Story language", { exact: true }).selectOption("fr");
  await appendInk(page, "\n// Note en français\n");
  await page.getByLabel("Story language", { exact: true }).selectOption("en");
  await expect(page.locator(".ace_text-layer")).toContainText("Author note in English");
  await page.getByLabel("Story title", { exact: true }).fill("The Photograph — edited");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Story title", { exact: true })).toHaveValue(
    "The House That Remembered",
  );
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.getByLabel("Story title", { exact: true })).toHaveValue(
    "The Photograph — edited",
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".editor-status").getByRole("status")).toHaveText(
    "Saved · reader updated",
    { timeout: 20_000 },
  );
  await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
  await expect(page.getByRole("button", { name: "▷ Preview", exact: true })).toBeEnabled();
  await expect(page.locator(".experience-preview .prose")).toContainText(
    "The first time you saw the girl",
  );
  await page.getByRole("button", { name: "Continue reading", exact: true }).click();
  await expect(page.locator(".experience-preview .prose")).toContainText("On the back");
  await page.getByRole("button", { name: "Close preview" }).click();
  await page.goto("/");
  await page.getByRole("button", { name: "Play an existing story" }).click();
  await expect(page.locator(".reader-story-title")).toContainText("The Photograph — edited");
  await expect(page.locator(".prose")).toContainText("The first time you saw the girl");
  expect(errors).toEqual([]);
});

test("retains the entire Inky Web menu, inserts a tunnel and exposes editable media and settings", async ({
  page,
}) => {
  await openEditor(page);
  await page.getByText("Additional Commands", { exact: true }).click();
  await page.getByText("Full stories", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pontoon Game (from Overboard!)", exact: true }),
  ).toBeVisible();
  await page.getByText("Additional Commands", { exact: true }).click();
  await page.locator(".ace_text-input").focus();
  await page.keyboard.press("Control+End");
  await page.getByRole("button", { name: "Tunnel", exact: true }).click();
  await page.getByLabel("Destination Knot or Stitch").fill("dream_sequence");
  await page.getByLabel("Create destination Knot").check();
  await page.getByRole("button", { name: "Insert Tunnel", exact: true }).click();
  await expect(page.locator(".ace_text-layer")).toContainText("-> dream_sequence ->");
  await expect(page.locator(".ace_text-layer")).toContainText("->->");
  await page.getByRole("tab", { name: "Story Outline", exact: true }).click();
  await page
    .locator(".editor-outline")
    .getByRole("button", { name: /intro.*Knot/ })
    .click();
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  await page.getByRole("button", { name: "Image", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Add Image" })).toBeVisible();
  await page.getByRole("button", { name: "Choose an image", exact: true }).click();
  await page.getByLabel("Search pictures", { exact: true }).fill("house.night");
  await page.locator('.image-picker button[data-asset="house.night"]').click();
  // Pass 11: the description is in its own section, with a plain label.
  await page
    .locator(".image-section > summary")
    .filter({ hasText: /^Description/ })
    .click();
  await page
    .getByLabel("Description (not shown, read aloud by screen readers)")
    .fill("A girl standing beside a house");
  await page.getByRole("button", { name: "Apply Image", exact: true }).click();
  await page.getByRole("tab", { name: "Scene Media", exact: true }).click();
  await expect(page.locator(".editor-outline")).toContainText("intro.image-");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Game Mode", { exact: true }).selectOption("narrative");
  const settings = page.getByRole("dialog", { name: "Story Settings", exact: true });
  await expect(settings.getByLabel("Custom page color", { exact: true })).toHaveValue(
    browserHouseProject.languages.en!.defaults.backgroundColor ?? "#f5ead7",
  );
  await settings.getByLabel("Custom page color", { exact: true }).fill("#131313");
  await page.getByRole("button", { name: "Apply settings" }).click();
  await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
  await expect(page.locator(".preview-slot .reader")).toHaveCSS(
    "background-color",
    "rgb(19, 19, 19)",
  );
  await expect(page.getByRole("tab", { name: "Game", exact: true })).toHaveCount(0);
});

test("retains invalid drafts and reports their errors instead of opening a stale story", async ({
  page,
}) => {
  await openEditor(page);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".editor-status").getByRole("status")).toHaveText(
    "Saved · reader updated",
    { timeout: 20_000 },
  );
  await appendInk(page, "\n=== broken ===\n-> target_does_not_exist\n");
  await expect(page.locator(".editor-status").getByRole("status")).toHaveText(
    "Draft saved · fix issues to update the reader",
    { timeout: 20_000 },
  );
  await page.reload();
  await expect(page.locator(".editor-status").getByRole("status")).toHaveText(
    "Saved project loaded",
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play an existing story" }).click();
  await expect(page.getByRole("alert")).toContainText("target_does_not_exist");
  await expect(page.getByRole("link", { name: "Open Story Editor", exact: true })).toBeVisible();
});

test("backs up a human recording and restores the complete project from history", async ({
  page,
}) => {
  await openEditor(page);
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  await page.getByRole("button", { name: "TTS", exact: true }).click();
  await page.getByLabel("Narration mode", { exact: true }).selectOption("human");
  await page
    .getByRole("combobox", { name: "Narrative segment", exact: true })
    .selectOption("intro.p1");
  await page
    .getByLabel("Rights attestation")
    .fill("Automated test fixture; no publication approval.");
  await page.getByLabel("Duration in seconds (optional override)", { exact: true }).fill("2.5");
  await page
    .getByLabel("Upload MP3")
    .setInputFiles(resolve("stories/house/media/sonniss.telephone.mp3"));
  await expect(page.getByRole("dialog").getByRole("status")).toContainText(
    "Human recording attached",
  );
  await page.getByLabel("Speed", { exact: true }).fill("1.5");
  await page.getByLabel("Volume", { exact: true }).fill("0.4");
  await expect
    .poll(() =>
      page
        .getByLabel("Narration preview")
        .evaluate((node: HTMLAudioElement) => ({ rate: node.playbackRate, volume: node.volume })),
    )
    .toEqual({ rate: 1.5, volume: 0.4 });
  await page.getByRole("button", { name: "Apply narration", exact: true }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".editor-status").getByRole("status")).toHaveText(
    "Saved · reader updated",
    { timeout: 20_000 },
  );
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Complete project backup", exact: true }).click();
  const artifact = await download;
  const backup = JSON.parse(await readFile((await artifact.path())!, "utf8"));
  expect(Object.values(backup.languages.en.configuration.embeddedAudio)[0]).toMatch(
    /^data:audio\/mpeg;base64,/,
  );
  expect(
    backup.languages.en.configuration.narration.find((c: { assetId: string }) =>
      c.assetId.startsWith("recording."),
    ).approval.status,
  ).toBe("preview");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("tab", { name: "Review", exact: true }).click();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await page
    .locator(".version")
    .filter({ hasText: "Original story" })
    .getByRole("button", { name: "Restore version" })
    .click();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const restoredDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Complete project backup", exact: true }).click();
  const restored = JSON.parse(await readFile((await (await restoredDownload).path())!, "utf8"));
  expect(restored.languages.en.configuration.embeddedAudio).toBeUndefined();
});
