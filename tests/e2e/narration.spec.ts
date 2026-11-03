import { expect, test } from "@playwright/test";

for (const locale of ["en", "fr"])
  test(`generated ${locale} narration uses verified MP3s and responds to playback controls`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/api/narration", (route) => route.fulfill({ status: 503, body: "{}" }));
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
      if (/narration\.[a-f0-9]+\.mp3$/.test(request.url())) requested.push(request.url());
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
    await page
      .getByText(locale === "fr" ? "Préférences de lecture" : "Reading preferences", {
        exact: true,
      })
      .click();
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
      .getByRole("button", { name: locale === "fr" ? "Réécouter" : "Replay voice", exact: true })
      .click();
    await expect.poll(async () => (await recordings()).length).toBe(2);
    await voice.uncheck();
    expect((await recordings())[1]!.pauses).toBeGreaterThan(0);
  });
