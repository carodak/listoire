import { expect, test } from "./test.ts";
import type { Page } from "@playwright/test";
import { playStory, readTo } from "./oree.ts";

/** Records Web Audio contexts and every media play() without changing what they do. */
async function recordAudio(page: Page) {
  await page.addInitScript(() => {
    const log = { contexts: 0, resumedInGesture: 0, played: [] as string[] };
    Object.assign(window, { audioLog: log });
    const Original = window.AudioContext;
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
      return play.call(this);
    };
  });
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
  expect(await audioLog(page)).toMatchObject({ contexts: 1, resumedInGesture: 1 });
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

test("the Story Editor starts audio on its first click", async ({ page }) => {
  await recordAudio(page);
  await page.goto("/editor");
  await expect(page.getByLabel("Ink script editor")).toBeVisible();
  expect((await audioLog(page)).contexts).toBe(0);
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  expect(await audioLog(page)).toMatchObject({ contexts: 1, resumedInGesture: 1 });
});
