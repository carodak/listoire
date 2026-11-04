import { expect, test } from "@playwright/test";
test("voice playback, pause and voice-off leave the committed passage unchanged", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/api/narration", (route) => route.fulfill({ status: 503, body: "{}" }));
  await page.route("**/stories/house/en.json", async (route) => {
    const response = await route.fetch();
    const bundle = await response.json();
    bundle.narration = [];
    await route.fulfill({ json: bundle });
  });
  await page.addInitScript(() => {
    const state = { calls: 0, cancels: 0, pauses: 0, resumes: 0, utterance: null as unknown };
    Object.assign(window, { voiceTest: state });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => [{ lang: "en-GB", localService: true }],
        speak: (utterance: unknown) => {
          state.calls++;
          state.utterance = utterance;
        },
        cancel: () => {
          state.cancels++;
        },
        pause: () => {
          state.pauses++;
        },
        resume: () => {
          state.resumes++;
        },
      },
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: class {
        text: string;
        constructor(text: string) {
          this.text = text;
        }
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Play an existing story" }).click();
  const heading = page.getByRole("heading", { name: "The Girl in the Photograph" });
  await expect(heading).toBeVisible();
  await page.getByText("Reading preferences", { exact: true }).click();
  await page.getByLabel("Read aloud", { exact: true }).check();
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { voiceTest: { calls: number } }).voiceTest.calls),
    )
    .toBe(1);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.evaluate(() => {
    const voice = (
      window as unknown as { voiceTest: { utterance: { onboundary: (event: unknown) => void } } }
    ).voiceTest;
    voice.utterance.onboundary({ charIndex: 40, charLength: 3 });
  });
  await expect(page.locator(".prose p").first()).toContainText("The first time");
  await page.getByLabel("Read aloud", { exact: true }).uncheck();
  await expect(page.getByRole("button", { name: "Continue reading", exact: true })).toBeEnabled();
  await expect(heading).toBeVisible();
  const result = await page.evaluate(async () => {
    const voice = (
      window as unknown as { voiceTest: { cancels: number; pauses: number; resumes: number } }
    ).voiceTest;
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("listoire");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const revision = await new Promise<number>((resolve) => {
      const request = database.transaction("records").objectStore("records").get("save:house:en");
      request.onsuccess = () => resolve(request.result.revision);
    });
    database.close();
    return { ...voice, revision };
  });
  expect(result.revision).toBe(1);
  expect(result.cancels).toBeGreaterThan(0);
  expect(result.pauses).toBeGreaterThan(0);
  expect(result.resumes).toBeGreaterThan(0);
});

test("a declarative cinematic can be skipped without changing its story result", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.getByRole("button", { name: "Play an existing story" }).click();
  await page.getByRole("button", { name: "Show all text", exact: true }).click();
  await page.getByRole("button", { name: "Continue reading", exact: true }).click();
  await page.getByRole("button", { name: "Show all text", exact: true }).click();
  await page.getByRole("button", { name: "Ask about the locked room", exact: true }).click();
  const cinematic = page.locator(".cinematic-dialog");
  await cinematic.getByRole("button", { name: "Pause", exact: true }).click();
  const viewport = page.viewportSize()!;
  const dialogBounds = (await cinematic.boundingBox())!;
  expect(dialogBounds.x).toBe(0);
  expect(dialogBounds.y).toBe(0);
  expect(dialogBounds.width).toBeCloseTo(viewport.width, 0);
  expect(dialogBounds.height).toBeCloseTo(viewport.height, 0);
  const image = cinematic.locator(".shot-image");
  const imageBounds = (await image.boundingBox())!;
  expect(imageBounds.width).toBeGreaterThanOrEqual(viewport.width - 1);
  expect(imageBounds.height).toBeGreaterThanOrEqual(viewport.height - 1);
  await expect(image).toHaveCSS("object-fit", "cover");
  await cinematic.getByRole("button", { name: "Resume", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Skip cinematic", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Skip cinematic", exact: true })).toHaveCount(0);
  await page.locator(".prose p").first().click();
  await expect(page.locator(".prose")).toContainText("twenty-nine years");
  await expect(page.getByRole("button", { name: "Continue reading", exact: true })).toBeEnabled();
  const running = await page
    .locator(".cinematic-stage")
    .evaluate((stage) => stage.getAnimations({ subtree: true }).length);
  expect(running).toBe(0);
});
