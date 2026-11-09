import { expect, test } from "./test.ts";
import type { Page } from "@playwright/test";
import { defaultReadingPreferences } from "../../src/contracts/presentation.ts";
test.setTimeout(60_000);

async function openTypographyStory(page: Page, narration = false, extra = "") {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/editor");
  await expect(page.locator(".ace_text-input")).toHaveCount(1, { timeout: 20_000 });
  await page.getByRole("button", { name: "Load / Import", exact: true }).click();
  await page.locator('input[type=file][accept=".ink,.json"]').setInputFiles({
    name: "type.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        schemaVersion: 1,
        storyId: "house",
        release: "typography-test",
        defaultLocale: "en",
        gameMode: "narrative",
        variables: [],
        languages: {
          en: {
            script: `-> start\n=== start ===\nA BOOM, then silence.\n${extra}\n* [Continue] -> next\n=== next ===\nThe next page begins.\n* [Continue again] -> last\n=== last ===\nThe final page begins.\n-> END`,
            description: "",
            missingTranslation: false,
            configuration: { title: "Typography test", chapter: "Test" },
            defaults: {
              ...defaultReadingPreferences,
              pageTurn: true,
              narration,
              reveal: "instant",
              narratorVoice: "device:test",
            },
            narrationMode: "ai-live",
          },
        },
      }),
    ),
  });
  await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
  await expect(page.locator(".preview-slot .prose")).toContainText("A BOOM, then silence.");
}

test("formats selected words, previews on hover and retains typography through undo, save and reload", async ({
  page,
}) => {
  await openTypographyStory(page);
  await page.getByLabel("Find in Ink", { exact: true }).fill("BOOM");
  await page.getByLabel("Find in Ink", { exact: true }).press("Enter");
  await page.getByLabel("Close search", { exact: true }).click();
  await page.getByRole("tab", { name: "Text", exact: true }).click();
  await page.locator(".text-style-menu summary").click();
  const shout = page.getByRole("button", { name: "shout", exact: true });
  await shout.hover();
  await expect(page.locator(".text-style-preview .type-style-shout")).toHaveText("BOOM");
  await expect(page.locator(".ace_content")).not.toContainText("<typo");
  await shout.click();
  await page.getByLabel("Text direction", { exact: true }).selectOption("diagonal-up");
  await page.getByLabel("Text spacing", { exact: true }).selectOption("wide");
  await page.getByRole("button", { name: "Apply to selection", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Typography applied" })).toBeVisible();
  await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
  const word = page.locator(".preview-slot .prose .type-style-shout");
  await expect(word).toHaveText("BOOM");
  await expect(word).toHaveClass(/type-direction-diagonal-up/);
  await expect(word).toHaveCSS("letter-spacing", /[1-9]/);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: /Continue$/ }).click();
  await expect(page.locator(".page-word-departure")).toContainText("B");
  await expect(page.locator(".preview-slot .prose")).toContainText("The next page begins.");
  await expect(page.locator(".page-word-departure")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".ace_content")).not.toContainText("<typo");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.locator(".ace_content")).toContainText("<typo");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".editor-status")).toContainText(/Saved|Published/);
  await page.reload();
  await expect(page.locator(".preview-slot .type-style-shout")).toHaveText("BOOM");
  await page.screenshot({ path: ".fallow/typography-editor.png" });
});

test("starts narration on every following page after pause, cancel and replay", async ({
  page,
}) => {
  await page.addInitScript(() => {
    class Utterance {
      constructor(public text: string) {}
    }
    let paused = false;
    let pending: Utterance | undefined;
    const spoken: string[] = [];
    const synth = Object.assign(new EventTarget(), {
      getVoices: () => [{ voiceURI: "test", lang: "en-US", name: "Test voice" }],
      pause: () => {
        paused = true;
      },
      resume: () => {
        paused = false;
        if (pending) {
          spoken.push(pending.text);
          pending = undefined;
        }
      },
      cancel: () => {
        pending = undefined;
      },
      speak: (value: Utterance) => {
        if (!paused) spoken.push(value.text);
        else pending = value;
      },
    });
    Object.defineProperty(window, "speechSynthesis", { value: synth });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: Utterance });
    Object.assign(window, { spoken });
  });
  await openTypographyStory(page, true);
  const spoken = () => page.evaluate(() => (window as unknown as { spoken: string[] }).spoken);
  await expect.poll(spoken).toContain("A BOOM, then silence.");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: /Continue$/ }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect.poll(spoken).toContain("The next page begins.");
  await page.getByRole("button", { name: /Continue again$/ }).click();
  await expect.poll(spoken).toContain("The final page begins.");
});

test("centers the Story Editor label within its landing button", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const link = page.getByRole("link", { name: "Story Editor", exact: true });
  await expect(link).toBeVisible();
  const difference = await link.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const text = range.getBoundingClientRect(),
      button = element.getBoundingClientRect();
    return Math.abs((text.top + text.bottom) / 2 - (button.top + button.bottom) / 2);
  });
  expect(difference).toBeLessThan(2);
});

test("renders vertical, falling, waved and handwritten words in the reader", async ({ page }) => {
  await openTypographyStory(
    page,
    false,
    '<typo direction="vertical" color="forest">DOWN</typo> <typo style="falling">falling</typo> <typo style="wave">é👩🏽‍🚀a</typo> <typo style="handwritten">a secret</typo>.',
  );
  const prose = page.locator(".preview-slot .prose");
  await expect(prose.locator(".type-direction-vertical")).toHaveCSS("writing-mode", "vertical-rl");
  await expect(prose.locator(".type-style-wave .type-letter")).toHaveCount(3);
  await expect(prose.locator(".type-style-falling .type-letter")).toHaveCount(7);
  await expect(prose.locator(".type-font-handwritten")).toHaveCSS(
    "font-family",
    /Listoire Handwriting/,
  );
  await expect(prose.locator(".sr-only").last()).toHaveText("DOWN falling é👩🏽‍🚀a a secret.");
  await page.locator(".experience-preview").screenshot({ path: ".fallow/typography-styles.png" });
});
