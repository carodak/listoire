import { expect, test } from "./test.ts";
import { houseBundles } from "../fixtures/house-project.ts";
test("voice playback, pause and voice-off leave the committed passage unchanged", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/api/narration", (route) => route.fulfill({ status: 503, body: "{}" }));
  await page.route("**/stories/house/en.json", async (route) => {
    const bundle = structuredClone(houseBundles.en!);
    bundle.narration = [];
    await route.fulfill({ json: bundle });
  });
  await page.addInitScript(() => {
    const state = { calls: 0, cancels: 0, pauses: 0, resumes: 0, utterance: null as unknown };
    Object.assign(window, { voiceTest: state });
    Object.defineProperty(window, "speechSynthesis", {
      value: Object.assign(new EventTarget(), {
        getVoices: () => [{ lang: "en-GB", localService: true, voiceURI: "test", name: "Test" }],
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
      }),
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
  await page.getByRole("button", { name: "Reading preferences", exact: true }).click();
  await page.getByLabel("Narrator", { exact: true }).selectOption("device:test");
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
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/stories/house/en.json", async (route) => {
    const bundle = structuredClone(houseBundles.en!);
    const room = bundle.scenes!.room!;
    const block = room.blocks!.find(
      (block) => block.kind === "media" && block.layout === "fullscreen",
    );
    const event = room.events!.find((event) => event.blocking && event.action.kind === "effect");
    if (block?.kind !== "media" || event?.action.kind !== "effect")
      throw new Error("Missing cinematic fixture");
    block.durationMs = 100;
    event.action.effect.duration = 5000;
    await route.fulfill({ json: bundle });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Play an existing story" }).click();
  await page.locator(".prose p").first().click();
  await page.getByRole("button", { name: "Continue reading", exact: true }).click();
  await page.locator(".prose p").first().click();
  await page.getByRole("button", { name: "Ask about the locked room", exact: true }).click();
  const cinematic = page.locator(".cinematic-dialog");
  const stage = await cinematic.locator(".cinematic-stage").elementHandle();
  await cinematic.getByRole("button", { name: "Pause", exact: true }).click();
  const viewport = page.viewportSize()!;
  const toolbar = (await page.locator(".reader-toolbar").boundingBox())!;
  const dialogBounds = (await cinematic.boundingBox())!;
  expect(dialogBounds.x).toBe(0);
  expect(dialogBounds.y).toBeCloseTo(toolbar.y + toolbar.height, 0);
  expect(dialogBounds.width).toBeCloseTo(viewport.width, 0);
  expect(dialogBounds.height).toBeCloseTo(viewport.height - dialogBounds.y, 0);
  const image = cinematic.locator(".shot-image").first();
  const imageBounds = (await image.boundingBox())!;
  expect(imageBounds.width).toBeGreaterThanOrEqual(viewport.width - 1);
  expect(imageBounds.height).toBeGreaterThanOrEqual(dialogBounds.height - 1);
  await expect(image).toHaveCSS("object-fit", "cover");
  await cinematic.getByRole("button", { name: "Resume", exact: true }).click();
  await cinematic.getByRole("button", { name: "Skip cinematic", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Skip cinematic", exact: true })).toHaveCount(0);
  await page.locator(".prose p").first().click();
  await expect(page.locator(".prose")).toContainText("twenty-nine years");
  await expect(page.getByRole("button", { name: "Continue reading", exact: true })).toBeEnabled();
  const running = await stage!.evaluate((stage) => stage.getAnimations({ subtree: true }).length);
  await stage!.dispose();
  expect(running).toBe(0);
  await expect(page.locator(".prose .media-fullscreen")).toHaveCount(0);
  await page.getByRole("button", { name: "Replay page", exact: true }).click();
  await expect(page.locator(".cinematic-dialog")).toBeVisible();
  await expect(page.locator(".cinematic-dialog")).toHaveCount(0, { timeout: 8000 });
  await expect(page.locator(".prose .media-fullscreen")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Continue reading", exact: true })).toBeEnabled();
});
