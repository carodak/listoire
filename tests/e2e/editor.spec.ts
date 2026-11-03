import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function openEditor(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/editor");
  await expect(page.getByLabel("Ink script editor")).toBeVisible();
  await expect(page.locator(".ace_text-input")).toHaveCount(1);
  await expect(page.getByRole("status")).toContainText(
    /Original story loaded|Saved project loaded/,
  );
}
async function appendInk(page: Page, text: string) {
  await page.locator(".ace_text-input").focus();
  await page.keyboard.press("Control+End");
  await page.keyboard.insertText(text);
}

test("saves custom voice profiles and sends the selected synthesis parameters to local preview", async ({
  page,
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
  await page
    .getByLabel("Voice example (MP3 / WAV, max 2 MB)", { exact: true })
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
  await expect(
    page.getByLabel("Story language", { exact: true }).locator("option").last(),
  ).toHaveText("+ Add Language…");
  await expect(page.locator(".project-files [aria-current=page]")).toContainText("en.ink");
  await page.getByLabel("Find in Ink", { exact: true }).fill("photograph");
  await page.getByLabel("Find in Ink", { exact: true }).press("Enter");
  await expect(page.locator(".ace_search_form input")).toHaveValue("photograph");
  await expect(page.locator(".ace_replace_form")).toBeHidden();
  await page.getByRole("button", { name: "Find and replace…", exact: true }).click();
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
  await expect(page.getByRole("status")).toHaveText("Saved · reader updated", { timeout: 20_000 });
  await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
  await expect(page.locator(".experience-preview .prose")).toContainText(
    "The first time you saw the girl",
  );
  await page.getByRole("button", { name: "Continue reading", exact: true }).click();
  await expect(page.locator(".experience-preview .prose")).toContainText("On the back");
  await page.getByRole("button", { name: "Close preview" }).click();
  await page.goto("/");
  await page.getByRole("button", { name: "Play an existing story" }).click();
  await expect(page.locator(".eyebrow")).toContainText("The Photograph — edited");
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
  await page.getByRole("button", { name: /Browse media library/ }).click();
  await page.getByLabel("Search media", { exact: true }).fill("human5");
  await page.getByRole("button", { name: "Use this media", exact: true }).click();
  await page.getByLabel("Alt text").fill("A girl standing beside a house");
  await page.getByRole("button", { name: "Apply Image", exact: true }).click();
  await page.getByRole("tab", { name: "Scene Media", exact: true }).click();
  await expect(page.locator(".editor-outline")).toContainText("intro.image-");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Game Mode", { exact: true }).selectOption("narrative");
  await page.getByRole("button", { name: "Apply settings" }).click();
  await expect(page.getByRole("tab", { name: "Game", exact: true })).toHaveCount(0);
});

test("autosaves invalid drafts without replacing the working story", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved · reader updated", { timeout: 20_000 });
  await appendInk(page, "\n=== broken ===\n-> target_does_not_exist\n");
  await expect(page.getByRole("status")).toHaveText(
    "Draft saved · fix issues to update the reader",
    { timeout: 20_000 },
  );
  await page.reload();
  await expect(page.getByRole("status")).toHaveText("Saved project loaded");
  await page.goto("/");
  await page.getByRole("button", { name: "Play an existing story" }).click();
  await expect(page.locator(".prose")).toContainText("The first time you saw the girl");
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
  await page.getByLabel("Duration in seconds (optional override)").fill("2.5");
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
  await expect(page.getByRole("status")).toHaveText("Saved · reader updated", { timeout: 20_000 });
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
