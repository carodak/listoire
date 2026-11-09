import { test as playwright } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export { expect } from "@playwright/test";
export const test = playwright.extend<{ coverage: void }>({
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
