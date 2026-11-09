import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect, test } from "./test.ts";

/** Orée narrates live (ai-live): answer the local narration server with a real MP3 and its digest. */
async function serveNarration(page: Page) {
  const mp3 = readFileSync(
    "public/stories/house/media/narration.3932985b744714925a9db05962b0de9e017eea335da2d00f184bb7cad461e8e4.mp3",
  );
  const sha = (data: Buffer | string) => createHash("sha256").update(data).digest("hex");
  const audioPath = `/api/narration/audio/${sha(mp3)}.mp3`;
  await page.route("**/api/narration/audio/**", (route) =>
    route.fulfill({ body: mp3, contentType: "audio/mpeg" }),
  );
  await page.route("**/api/narration", (route) => {
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
    return route.fulfill({ json: { clip, audioPath } });
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
    if (locale === "fr") {
      await page.getByRole("button", { name: "Language: English", exact: true }).click();
      await page.getByRole("button", { name: "Français", exact: true }).click();
    }
    await page
      .getByRole("button", {
        name: locale === "fr" ? "Jouer à une histoire existante" : "Play an existing story",
        exact: true,
      })
      .click();
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
