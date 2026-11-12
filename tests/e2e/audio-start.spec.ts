import { expect, test } from "./test.ts";
import type { Page } from "@playwright/test";
import { playStory, readTo } from "./oree.ts";

/** Records Web Audio contexts and every media play() without changing what they do. */
async function recordAudio(page: Page) {
  await page.addInitScript(() => {
    const log = {
      contexts: 0,
      resumedInGesture: 0,
      played: [] as string[],
      elements: [] as HTMLMediaElement[],
    };
    Object.assign(window, { audioLog: log });
    const Original = window.AudioContext;
    // Playwright's WebKit for Windows has no Web Audio (Safari has): nothing to record there.
    if (Original)
      window.AudioContext = class extends Original {
        constructor(options?: AudioContextOptions) {
          super(options);
          log.contexts++;
        }
        override resume() {
          if (navigator.userActivation.isActive) log.resumedInGesture++;
          return super.resume();
        }
      };
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      log.played.push(this.currentSrc || this.src);
      log.elements.push(this);
      return play.call(this);
    };
  });
}
/** One Web Audio context, created and resumed in the gesture; none without Web Audio. */
async function expectAudioStartedInGesture(page: Page) {
  const webAudio = await page.evaluate(() => typeof AudioContext === "function");
  expect(await audioLog(page)).toMatchObject(
    webAudio ? { contexts: 1, resumedInGesture: 1 } : { contexts: 0 },
  );
}
const audioLog = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as {
          audioLog: { contexts: number; resumedInGesture: number; played: string[] };
        }
      ).audioLog,
  );

test("Play starts audio in its click, and story sound plays without enabling it by hand", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/narration**", (route) => route.fulfill({ status: 503, body: "{}" }));
  await recordAudio(page);
  await page.goto("/");
  expect((await audioLog(page)).contexts).toBe(0);
  await playStory(page);
  await expectAudioStartedInGesture(page);
  await page.getByRole("button", { name: "Reading preferences", exact: true }).click();
  await expect(page.getByLabel("Story sound effects", { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Reading preferences", exact: true }).click();
  await readTo(page, "atelier"); // starts a sound effect and music
  await expect
    .poll(async () =>
      (await audioLog(page)).played.some((src) => src.endsWith("audio.5ed3276af9fe4c73edaa.mp3")),
    )
    .toBe(true);
});

test("music and ambience really play: their time advances", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/narration**", (route) => route.fulfill({ status: 503, body: "{}" }));
  await recordAudio(page);
  await page.goto("/");
  await playStory(page);
  await readTo(page, "atelier");
  const playing = () =>
    page.evaluate(() =>
      (window as unknown as { audioLog: { elements: HTMLMediaElement[] } }).audioLog.elements
        .filter((element) => !element.paused && element.currentTime > 0.5)
        .map((element) => element.src.split("/").at(-1)),
    );
  await expect
    .poll(playing, { timeout: 15000 })
    .toEqual(expect.arrayContaining(["audio.5ed3276af9fe4c73edaa.mp3", "oree.wonder.mp3"]));
});

test("the Story Editor starts audio on its first click", async ({ page }) => {
  await recordAudio(page);
  await page.goto("/editor");
  await expect(page.getByLabel("Ink script editor")).toBeVisible();
  expect((await audioLog(page)).contexts).toBe(0);
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  await expectAudioStartedInGesture(page);
});
