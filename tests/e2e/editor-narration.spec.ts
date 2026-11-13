import { expect, test } from "./test.ts";
import { resolve } from "node:path";
import { backup, openHouseEditor, withHouseProject } from "./editor.ts";
import { fakeSpeech, spokenTexts } from "./speech.ts";
import { openTypographyStory } from "./typography-story.ts";

/** A silent 6-second mono WAV, as an author's voice example. */
function silentWav() {
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
  return wav;
}

test("saves custom voice profiles and sends the selected synthesis parameters to local preview", async ({
  page,
  browserName,
}) => {
  await openHouseEditor(page);
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
  if (browserName === "webkit")
    await page
      .getByLabel("Example duration in seconds (optional override)", { exact: true })
      .fill("6");
  await page
    .getByLabel("Voice example (MP3 / WAV, max 5 MB)", { exact: true })
    .setInputFiles({ name: "example.wav", mimeType: "audio/wav", buffer: silentWav() });
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
  const saved = await backup(page);
  expect(saved.languages.en.configuration.voiceProfiles).toContainEqual(
    expect.objectContaining({ label: "Example voice" }),
  );
  expect(saved.languages.en.configuration.speechSettings.pitch).toBe(3);
});

test("backs up a human recording and restores the complete project from history", async ({
  page,
}) => {
  await openHouseEditor(page);
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
  await page.getByLabel("Upload MP3").setInputFiles(resolve("public/audio/keyboard-typing.mp3"));
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
  const saved = await backup(page);
  expect(Object.values(saved.languages.en.configuration.embeddedAudio)[0]).toMatch(
    /^data:audio\/mpeg;base64,/,
  );
  expect(
    saved.languages.en.configuration.narration.find((c: { assetId: string }) =>
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
  expect((await backup(page)).languages.en.configuration.embeddedAudio).toBeUndefined();
});

test("starts narration on every following page after pause, cancel and replay", async ({
  page,
}) => {
  await withHouseProject(page);
  await fakeSpeech(page);
  await openTypographyStory(page, true);
  await expect.poll(() => spokenTexts(page)).toContain("A BOOM, then silence.");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: /Continue$/ }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect.poll(() => spokenTexts(page)).toContain("The next page begins.");
  await page.getByRole("button", { name: /Continue again$/ }).click();
  await expect.poll(() => spokenTexts(page)).toContain("The final page begins.");
});

test("previews an installed narrator and releases the voice when its dialog closes", async ({
  page,
}) => {
  await page.addInitScript(() => {
    class Utterance {
      constructor(public text: string) {}
      onend?: () => void;
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: Utterance });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => [
          { voiceURI: "test-voice", name: "Test narrator", lang: "en-US", localService: true },
        ],
        addEventListener() {},
        removeEventListener() {},
        cancel() {},
        speak(utterance: Utterance) {
          queueMicrotask(() => utterance.onend?.());
        },
      },
    });
  });
  await page.goto("/editor");
  await expect(page.locator(".ace_text-input")).toHaveCount(1);
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  await page.getByRole("button", { name: "TTS", exact: true }).click();
  await page.getByText("More narrators · device voices (EN)", { exact: true }).click();
  await page.getByLabel("Device narrator", { exact: true }).selectOption("test-voice");
  await page.getByRole("button", { name: "Preview selected narrator", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Preview complete" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "TTS / Narration", exact: true })).toHaveCount(0);
});
