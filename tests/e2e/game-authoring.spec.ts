import { expect, test } from "./test.ts";

test("edits game rules and definitions together without changing authored text", async ({
  page,
}) => {
  await page.goto("/editor");
  await expect(page.locator(".ace_text-input")).toHaveCount(1);
  await page.getByRole("tab", { name: "Game", exact: true }).click();
  await page.getByRole("button", { name: "Combat", exact: true }).click();
  const game = page.getByRole("dialog", { name: "Game · rules and actions", exact: true });
  await game.getByRole("button", { name: "Rules", exact: true }).click();
  await game.getByLabel("Escape attribute", { exact: true }).selectOption("DEX");
  await game.getByRole("button", { name: "Encounters", exact: true }).click();
  await game.getByRole("button", { name: "+ Encounter", exact: true }).click();
  await game.getByLabel("Stable ID", { exact: true }).fill("coverage-guard");
  await game.getByLabel("Name", { exact: true }).fill("The training guard");
  await game.getByRole("button", { name: "Items", exact: true }).click();
  await game.getByRole("button", { name: "+ Item", exact: true }).click();
  await game.getByLabel("Stable ID", { exact: true }).fill("coverage-weapon");
  await game.getByLabel("Equipment slot", { exact: true }).selectOption("weapon");
  await game.getByLabel("HP bonus", { exact: true }).fill("2");
  await game.getByRole("button", { name: "Abilities", exact: true }).click();
  await game.getByLabel("Ability name", { exact: true }).first().fill("A renamed ability");
  await game.getByRole("button", { name: "Actions", exact: true }).click();
  await game.getByRole("button", { name: "+ Action", exact: true }).click();
  await game.getByLabel("Stable action ID", { exact: true }).fill("coverage-combat");
  await game.getByLabel("Use definition", { exact: true }).selectOption("coverage-guard");
  await game.getByRole("button", { name: "Apply game configuration", exact: true }).click();
  await expect(game).toHaveCount(0);
  await page.getByRole("button", { name: "Combat", exact: true }).click();
  await game.getByRole("button", { name: "Rules", exact: true }).click();
  await expect(game.getByLabel("Escape attribute", { exact: true })).toHaveValue("DEX");
  await game.getByRole("button", { name: "Encounters", exact: true }).click();
  await game
    .getByRole("combobox", { name: "Encounter", exact: true })
    .selectOption({ label: "The training guard" });
  await expect(game.getByLabel("Stable ID", { exact: true })).toHaveValue("coverage-guard");
});

test("inserts upstream Ink snippets and opens validated character properties", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.locator(".ace_text-input")).toHaveCount(1);
  await page.locator(".ace_text-input").focus();
  await page.keyboard.press("Control+End");
  await page.getByRole("tab", { name: "Logic", exact: true }).click();
  await page.getByRole("button", { name: "Declare Variable", exact: true }).click();
  await expect(page.locator(".ace_content")).toContainText("VAR");
  await page.getByRole("tab", { name: "Game", exact: true }).click();
  await page.getByRole("button", { name: "Character", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Character configuration", exact: true }),
  ).toBeVisible();
});

test("previews an installed narrator and releases the voice when its dialog closes", async ({
  page,
}) => {
  await page.addInitScript(() => {
    class Utterance {
      constructor(public text: string) {}
      onend?: () => void;
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: Utterance });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => [
          { voiceURI: "test-voice", name: "Test narrator", lang: "en-US", localService: true },
        ],
        addEventListener() {},
        removeEventListener() {},
        cancel() {},
        speak(utterance: Utterance) {
          queueMicrotask(() => utterance.onend?.());
        },
      },
    });
  });
  await page.goto("/editor");
  await expect(page.locator(".ace_text-input")).toHaveCount(1);
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  await page.getByRole("button", { name: "TTS", exact: true }).click();
  await page.getByText("More narrators · device voices (EN)", { exact: true }).click();
  await page.getByLabel("Device narrator", { exact: true }).selectOption("test-voice");
  await page.getByRole("button", { name: "Preview selected narrator", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Preview complete" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "TTS / Narration", exact: true })).toHaveCount(0);
});
