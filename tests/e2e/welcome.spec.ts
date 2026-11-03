import { expect, test } from "@playwright/test";

test("language choices display flags and support keyboard selection and Escape", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const language = page.getByRole("button", { name: "Language: English", exact: true });
  await expect(language.locator("svg")).toBeVisible();
  await language.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Change language", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Français", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(language).toBeFocused();
  await expect(page.getByRole("button", { name: "Français", exact: true })).toBeHidden();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Français", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await page.getByRole("button", { name: "Langue: Français", exact: true }).click();
  await expect(page.getByText("Changer de langue", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Entrez dans l’histoire." })).toBeVisible();
});

test("the original welcome reveals its subtitle and offers stories within three seconds", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Step inside the story." })).toBeVisible();
  const play = page.getByRole("button", { name: "Play an existing story" });
  await expect(page.getByText("A quiet place for stories", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Typing sound")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Skip introduction" })).toHaveCount(0);
  await expect(page.locator(".language-picker summary")).toHaveCSS("border-bottom-width", "0px");
  await expect(play).toBeDisabled();
  await expect(play).toBeEnabled({ timeout: 3000 });
  await expect(page.locator(".subtitle-reveal")).toHaveText(
    "A new audiovisual way to experience novels, where your choices shape the story.",
  );
  await expect(page.getByRole("button", { name: /Create your own scenario/ })).toBeDisabled();
  await expect(page.getByText("Coming soon", { exact: true })).toBeVisible();
  if (["chromium", "mobile"].includes(info.project.name)) {
    await page.screenshot({ path: info.outputPath("welcome.png"), fullPage: true });
  }
  await play.click();
  await expect(page.getByRole("button", { name: "Call into the house" })).toBeVisible();
});

test("reduced motion presents everything immediately without initializing audio", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Object.defineProperty(window, "Audio", {
      value: class {
        constructor() {
          throw new Error("Reduced motion must not initialize audio");
        }
      },
    });
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Play an existing story" })).toBeEnabled({
    timeout: 700,
  });
  await expect(page.locator(".subtitle-reveal")).toHaveText(
    "A new audiovisual way to experience novels, where your choices shape the story.",
  );
  expect(errors).toEqual([]);
});

test("story access is bounded even when animation frames are throttled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    window.requestAnimationFrame = () => 0;
    window.cancelAnimationFrame = () => {};
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Play an existing story" })).toBeEnabled({
    timeout: 3000,
  });
  await expect(page.locator(".subtitle-reveal")).toHaveText(
    "A new audiovisual way to experience novels, where your choices shape the story.",
  );
});

test("blocked audio leaves the visual intro and story access working", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    Object.defineProperty(window, "Audio", {
      value: class {
        play() {
          return Promise.reject(new DOMException("Autoplay blocked", "NotAllowedError"));
        }
        pause() {}
      },
    });
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("heading", { name: "Step inside the story." }).click();
  await page.getByRole("button", { name: "Play an existing story" }).click();
  await expect(page.getByRole("button", { name: "Listen at the door" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("typing recording is attempted once at startup and paused when the intro ends", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    const events: string[] = [];
    Object.assign(window, { typingEvents: events });
    Object.defineProperty(window, "Audio", {
      value: class {
        constructor(source: string) {
          events.push(source);
        }
        play() {
          events.push("play");
          return Promise.resolve();
        }
        pause() {
          events.push("pause");
        }
      },
    });
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Play an existing story" })).toBeEnabled();
  const events = await page.evaluate(
    () => (window as unknown as { typingEvents: string[] }).typingEvents,
  );
  expect(events.filter((event) => event === "play")).toHaveLength(1);
  expect(events).toContain("/audio/keyboard-typing.mp3");
  expect(events).toContain("pause");
});
