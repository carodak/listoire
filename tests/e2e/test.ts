import { test as playwright } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export { expect } from "@playwright/test";
export const test = playwright.extend<{ coverage: void; silence: void }>({
  // Tests run unattended: no voice or sound reaches the speakers. Chromium and Firefox are muted
  // in playwright.config.ts; device voices (the OS speech engine) and WebKit media are muted here.
  silence: [
    async ({ page, browserName }, use) => {
      await page.addInitScript((muteMedia) => {
        const speak = globalThis.SpeechSynthesis?.prototype.speak;
        if (speak)
          SpeechSynthesis.prototype.speak = function (utterance) {
            utterance.volume = 0;
            return speak.call(this, utterance);
          };
        if (!muteMedia) return;
        const play = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
          this.muted = true;
          return play.call(this);
        };
      }, browserName === "webkit");
      await use();
    },
    { auto: true },
  ],
  coverage: [
    async ({ page, browserName }, use, info) => {
      const directory = process.env.FALLOW_BROWSER_COVERAGE;
      if (!directory || browserName !== "chromium") return use();
      await page.coverage.startJSCoverage({ resetOnNavigation: false });
      try {
        await use();
      } finally {
        const scripts = (await page.coverage.stopJSCoverage()).filter((script) =>
          new URL(script.url).pathname.startsWith("/src/"),
        );
        await mkdir(directory, { recursive: true });
        await writeFile(
          resolve(directory, `${info.testId}-${info.retry}.json`),
          JSON.stringify(scripts),
        );
      }
    },
    { auto: true },
  ],
});
