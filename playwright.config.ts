import { defineConfig, devices } from "@playwright/test";

// E2E_PORT lets e2e and `npm run test:coverage` use another dev server port.
const port = process.env.E2E_PORT ?? "4173";
if (!/^\d{2,5}$/.test(port)) throw new Error(`E2E_PORT must be a port number, got "${port}".`);

const mute = ["--mute-audio"];

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: process.env.CI ? 2 : 1,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: { baseURL: `http://127.0.0.1:${port}`, trace: "retain-on-failure" },
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    // Muted: tests must not be heard (WebKit has no switch; see tests/e2e/test.ts).
    { name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: { args: mute } } },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        launchOptions: { firefoxUserPrefs: { "media.volume_scale": "0.0" } },
      },
    },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions: { args: mute } } },
  ],
});
