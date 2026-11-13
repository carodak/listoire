import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect, test } from "./test.ts";
import { houseBundles } from "../fixtures/house-project.ts";
import { readKeys } from "./idb.ts";
import { chooseLanguage, enterReader } from "./oree.ts";
import { fakeSpeech, speakBoundary } from "./speech.ts";

/** Orée narrates live (ai-live): answer the local narration server with a real MP3 and its digest. */
async function serveNarration(page: Page, delays = { generateMs: 0, downloadMs: 0 }) {
  const mp3 = readFileSync(
    "public/stories/house/media/narration.3932985b744714925a9db05962b0de9e017eea335da2d00f184bb7cad461e8e4.mp3",
  );
  const sha = (data: Buffer | string) => createHash("sha256").update(data).digest("hex");
  const audioPath = `/api/narration/audio/${sha(mp3)}.mp3`;
  await page.route("**/api/narration/audio/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delays.downloadMs));
    await route.fulfill({ body: mp3, contentType: "audio/mpeg" }).catch(() => {});
  });
  await page.route("**/api/narration", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delays.generateMs));
    const request = route.request().postDataJSON();
    const clip = {
      segmentId: request.segmentId,
      locale: request.locale,
      voiceId: request.voiceId,
      settingsKey: request.settingsKey,
      spokenTextDigest: sha(request.text.normalize("NFC")),
      assetId: "narration.test",
      audioDigest: sha(mp3),
      durationMs: 20000,
      marks: [],
      approval: { status: "preview", reviewer: "e2e", rightsReference: "test fixture" },
    };
    await route.fulfill({ json: { clip, audioPath } }).catch(() => {});
  });
}

for (const locale of ["en", "fr"])
  test(`generated ${locale} narration uses verified MP3s and responds to playback controls`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await serveNarration(page);
    await page.addInitScript(() => {
      const records: {
        url: string;
        plays: number;
        pauses: number;
        volume: number;
        playbackRate: number;
      }[] = [];
      Object.assign(window, { narrationRecords: records });
      Object.defineProperty(window, "Audio", {
        value: class extends EventTarget {
          currentTime = 0;
          duration = 20;
          loop = false;
          record: (typeof records)[number];
          constructor(url: string) {
            super();
            this.record = { url, plays: 0, pauses: 0, volume: 1, playbackRate: 1 };
            records.push(this.record);
          }
          get volume() {
            return this.record.volume;
          }
          set volume(value) {
            this.record.volume = value;
          }
          get playbackRate() {
            return this.record.playbackRate;
          }
          set playbackRate(value) {
            this.record.playbackRate = value;
          }
          play() {
            this.record.plays++;
            return Promise.resolve();
          }
          pause() {
            this.record.pauses++;
          }
        },
      });
    });
    const requested: string[] = [];
    page.on("request", (request) => {
      if (/\/api\/narration\/audio\/[a-f0-9]{64}\.mp3$/.test(request.url()))
        requested.push(request.url());
    });
    await page.goto("/");
    if (locale === "fr") await chooseLanguage(page, "fr");
    const play = page.getByRole("button", {
      name: locale === "fr" ? "Jouer à une histoire existante" : "Play an existing story",
      exact: true,
    });
    await play.click();
    const preferences = page.getByRole("button", {
      name: locale === "fr" ? "Préférences de lecture" : "Reading preferences",
      exact: true,
    });
    await preferences.click();
    const voice = page.getByRole("checkbox", {
      name: locale === "fr" ? "Lire à voix haute" : "Read aloud",
      exact: true,
    });
    await voice.check();
    const recordings = () =>
      page.evaluate(() =>
        (
          window as unknown as {
            narrationRecords: {
              url: string;
              plays: number;
              pauses: number;
              playbackRate: number;
            }[];
          }
        ).narrationRecords.filter((record) => record.url.startsWith("blob:")),
      );
    await expect.poll(async () => (await recordings()).length).toBe(1);
    expect(requested.length).toBeGreaterThan(0);
    // A reload in the middle of a clip: the restored page is silent until the reader replays it,
    // and the voice, still on, narrates it again.
    await page.reload();
    await play.click();
    await page
      .getByRole("button", {
        name: locale === "fr" ? "Rejouer la page" : "Replay page",
        exact: true,
      })
      .click();
    await expect.poll(async () => (await recordings()).length).toBe(1);
    await preferences.click();
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await page
      .getByRole("button", { name: locale === "fr" ? "Reprendre" : "Resume", exact: true })
      .click();
    await expect.poll(async () => (await recordings())[0]!.plays).toBe(2);
    await page
      .getByLabel(locale === "fr" ? "Vitesse de la voix" : "Voice speed", { exact: true })
      .fill("1.3");
    await expect.poll(async () => (await recordings())[0]!.playbackRate).toBe(1.3);
    await page
      // The separate "Replay voice" control was removed; replaying the page restarts the voice.
      .getByRole("button", {
        name: locale === "fr" ? "Rejouer la page" : "Replay page",
        exact: true,
      })
      .click();
    await expect.poll(async () => (await recordings()).length).toBe(2);
    if (!(await voice.isVisible())) await preferences.click();
    await voice.uncheck();
    expect((await recordings())[1]!.pauses).toBeGreaterThan(0);
  });

test("live narration says it is preparing, then plays a clip that downloads slowly", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  // Generation takes 2 s; the clip then takes 7 s to download (the old limit was 5 s).
  await serveNarration(page, { generateMs: 2000, downloadMs: 7000 });
  await page.addInitScript(() => {
    const started: string[] = [];
    Object.assign(window, { narrationStarted: started });
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (this.src.startsWith("blob:")) started.push(this.src);
      return play.call(this);
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Play an existing story" }).click();
  const preparing = page.locator(".narration-preparing");
  await expect(preparing).toHaveText("Preparing narration…");
  await expect(preparing).toHaveAttribute("role", "status");
  await expect(preparing).toHaveText("", { timeout: 5000 });
  await expect
    .poll(
      () =>
        page.evaluate(() => (window as unknown as { narrationStarted: string[] }).narrationStarted),
      { timeout: 15000 },
    )
    .toHaveLength(1);
});

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
  type Voice = {
    calls: number;
    cancels: number;
    pauses: number;
    resumes: number;
    utterance: { onboundary: (event: unknown) => void };
  };
  const voice = () => page.evaluate(() => (window as unknown as { voiceTest: Voice }).voiceTest);
  await page.goto("/");
  await page.getByRole("button", { name: "Play an existing story" }).click();
  const heading = page.getByRole("heading", { name: "The Girl in the Photograph" });
  await expect(heading).toBeVisible();
  await page.getByRole("button", { name: "Reading preferences", exact: true }).click();
  await page.getByLabel("Narrator", { exact: true }).selectOption("device:test");
  await page.getByLabel("Read aloud", { exact: true }).check();
  await expect.poll(async () => (await voice()).calls).toBe(1);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.evaluate(() =>
    (window as unknown as { voiceTest: Voice }).voiceTest.utterance.onboundary({
      charIndex: 40,
      charLength: 3,
    }),
  );
  await expect(page.locator(".prose p").first()).toContainText("The first time");
  await page.getByLabel("Read aloud", { exact: true }).uncheck();
  await expect(page.getByRole("button", { name: "Continue reading", exact: true })).toBeEnabled();
  await expect(heading).toBeVisible();
  const [save] = (await readKeys(page, "reader", ["save:house:en"])) as [{ revision: number }];
  expect(save.revision).toBe(1);
  const { cancels, pauses, resumes } = await voice();
  expect(cancels).toBeGreaterThan(0);
  expect(pauses).toBeGreaterThan(0);
  expect(resumes).toBeGreaterThan(0);
});

/** The voice reaches "On"; the visible text's length, sampled on every frame for 400 ms. */
const revealAfterFirstWord = (page: Page) =>
  page.evaluate(async () => {
    type Spoken = { onboundary?: (event: unknown) => void }[];
    (window as unknown as { spoken: Spoken }).spoken
      .at(-1)!
      .onboundary?.({ charIndex: 0, charLength: 2 });
    const lengths: number[] = [];
    const until = performance.now() + 400;
    const text = () => document.querySelector('.prose p > span[aria-hidden="true"]');
    await new Promise<void>((resolve) => {
      const sample = () => {
        lengths.push(text()?.textContent?.length ?? 0);
        if (performance.now() < until) requestAnimationFrame(sample);
        else resolve();
      };
      requestAnimationFrame(sample);
    });
    return lengths;
  });

test("types graphemes smoothly while staying just one word ahead of narrated boundaries", async ({
  page,
}) => {
  await fakeSpeech(page);
  await enterReader(page, { skipIntro: false });
  await page.getByRole("button", { name: "Reading preferences", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Text display", exact: true })
    .selectOption("progressive");
  await page.getByRole("combobox", { name: "Narrator", exact: true }).selectOption("device:test");
  await page.getByRole("checkbox", { name: "Read aloud", exact: true }).check();
  await page.locator(".reading-sidebar header button").click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Replay page", exact: true }).click();
  const visible = page.locator('.prose p > span[aria-hidden="true"]').first();
  await expect(visible).toHaveText("On");
  const samples = await revealAfterFirstWord(page);
  expect(samples.some((length) => length > 3 && length < 13)).toBe(true);
  expect(samples.every((length, index) => !index || length - samples[index - 1]! <= 5)).toBe(true);
  await expect(visible).toHaveText("On Wednesdays,");
  await speakBoundary(page, 3, 11);
  await expect(visible).toHaveText("On Wednesdays, you");
});
