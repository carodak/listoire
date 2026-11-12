import { expect, type Page } from "@playwright/test";
import { defaultReadingPreferences } from "../../src/contracts/presentation.ts";

/** The small test story: "A BOOM, then silence.", then `extra` lines, then two more pages. */
export function typographyProject(
  narration = false,
  extra = "",
  reveal: "instant" | "progressive" = "instant",
  backgroundColor?: string,
) {
  return {
    schemaVersion: 1,
    storyId: "house",
    release: "typography-test",
    defaultLocale: "en",
    gameMode: "narrative",
    variables: [],
    languages: {
      en: {
        script: `-> start
=== start ===
A BOOM, then silence.
${extra}
* [Continue] -> next
=== next ===
The next page begins.
* [Continue again] -> last
=== last ===
The final page begins.
-> END`,
        description: "",
        missingTranslation: false,
        configuration: { title: "Typography test", chapter: "Test" },
        defaults: {
          ...defaultReadingPreferences,
          pageTurn: true,
          narration,
          reveal,
          narratorVoice: "device:test",
          backgroundColor,
        },
        narrationMode: "ai-live",
      },
    },
  } as const;
}

/** Imports the test story into the editor and opens its preview. */
export async function openTypographyStory(
  page: Page,
  ...options: Parameters<typeof typographyProject>
) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/editor");
  await expect(page.locator(".ace_text-input")).toHaveCount(1, { timeout: 20_000 });
  await page.getByRole("button", { name: "Load / Import", exact: true }).click();
  await page.locator('input[type=file][accept=".ink,.json"]').setInputFiles({
    name: "type.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(typographyProject(...options))),
  });
  await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
  await expect(page.locator(".preview-slot .prose")).toContainText("A BOOM, then silence.");
}

/** The script as stored, not as Ace renders it (soft wrap adds spaces). */
export const script = (page: Page) =>
  page
    .locator(".ink-editor")
    .evaluate((node) =>
      (node as unknown as { env: { editor: { getValue(): string } } }).env.editor.getValue(),
    );
