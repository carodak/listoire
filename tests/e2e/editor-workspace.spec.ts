import { expect, test } from "./test.ts";
import type { Locator, Page } from "@playwright/test";
import { browserHouseProject } from "../fixtures/house-project.ts";
import { appendInk, findInInk, openHouseEditor, script, withHouseProject } from "./editor.ts";
import { fakeSpeech, spokenTexts } from "./speech.ts";
import { openTypographyStory } from "./typography-story.ts";

async function expectTabPattern(page: Page, tablist: Locator) {
  const tabs = tablist.getByRole("tab");
  const first = tabs.first();
  await first.click();
  await expect(first).toHaveAttribute("aria-selected", "true");
  await expect(first).toHaveAttribute("tabindex", "0");
  await expect(tabs.nth(1)).toHaveAttribute("tabindex", "-1");
  const panelId = (await first.getAttribute("aria-controls"))!;
  await expect(page.locator(`#${panelId}`)).toHaveAttribute("role", "tabpanel");
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(`#${panelId}`)).toHaveAttribute(
    "aria-labelledby",
    (await tabs.nth(1).getAttribute("id"))!,
  );
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(tabs.last()).toBeFocused();
  await expect(tabs.last()).toHaveAttribute("aria-selected", "true");
}

test("opens on the story's first passage; ribbon and project tabs follow the ARIA tab pattern", async ({
  page,
}) => {
  await page.goto("/editor");
  await expect(
    page.getByRole("button", { name: "Preview from matin-ville", exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await expectTabPattern(page, page.getByRole("tablist", { name: "Ribbon categories" }));
  await expectTabPattern(page, page.getByRole("tablist", { name: "Project panels" }));
});

test("search, sidebar media highlighting, compatible animations and docked preview", async ({
  page,
}) => {
  await openHouseEditor(page);
  await expect(page.locator(".preview-slot .prose")).toBeVisible();
  await expect(page.locator(".preview-header button")).toHaveCount(2);
  await expect(
    page.locator(".preview-slot").getByRole("button", { name: "Previous page", exact: true }),
  ).toHaveCount(0);
  const language = page.getByLabel("Story language", { exact: true });
  await expect(language.locator("option:checked")).toHaveText("EN");
  expect((await language.boundingBox())!.width).toBeLessThan(75);
  await expect(page.getByRole("button", { name: "Fullscreen preview", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Fullscreen preview", exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator(".experience-preview")
        .evaluate(
          (node) =>
            document.fullscreenElement === node || node.getAttribute("data-window") === "maximized",
        ),
    )
    .toBe(true);
  if (await page.evaluate(() => Boolean(document.fullscreenElement)))
    await page.evaluate(() => document.exitFullscreen());
  else await page.getByRole("button", { name: "Fullscreen preview", exact: true }).click();
  if ((page.viewportSize()?.width ?? 0) > 1000) {
    await page
      .getByRole("separator", { name: "Resize navigation", exact: true })
      .press("ArrowRight");
    await expect(
      page.getByRole("separator", { name: "Resize navigation", exact: true }),
    ).toHaveAttribute("aria-valuenow", "239");
  }
  await expect(language.locator("option").last()).toHaveText("+ Add Language…");
  await expect(page.locator(".project-files [aria-current=page]")).toContainText("en.ink");
  await page.getByLabel("Find in Ink", { exact: true }).fill("photograph");
  await page.getByLabel("Find in Ink", { exact: true }).press("Enter");
  await expect(page.locator(".ace_search_form input")).toHaveValue("photograph");
  await expect(page.locator(".ace_replace_form")).toBeHidden();
  await page.getByRole("button", { name: "Or find and replace…", exact: true }).click();
  await expect(page.locator(".ace_replace_form")).toBeVisible();
  await expect(page.getByLabel("Close search", { exact: true })).toHaveText("×");
  await page.getByLabel("Close search", { exact: true }).click();
  await page.getByRole("tab", { name: "Story Outline", exact: true }).click();
  await page
    .locator(".editor-outline")
    .getByRole("button", { name: /intro.*Knot/ })
    .click();
  await page.getByRole("tab", { name: "Scene Media", exact: true }).click();
  await page.locator(".editor-outline button").filter({ hasText: "intro.illustration" }).hover();
  await expect(page.locator(".editor-media-highlight")).toHaveCount(1);
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  await page.getByRole("button", { name: "Animation", exact: true }).click();
  await page.getByLabel("Target", { exact: true }).selectOption("intro.illustration");
  await expect(
    page.getByLabel("Animation", { exact: true }).locator('option[value="fog-overlay"]'),
  ).toHaveCount(0);
  await page.getByLabel("Target", { exact: true }).selectOption("page");
  await expect(page.getByLabel("Animation", { exact: true }).locator("option")).toContainText([
    "fade-in",
    "fade-out",
    "screen-shake",
    "light-flicker",
    "rain-overlay",
    "fog-overlay",
  ]);
  await page.getByLabel("Target", { exact: true }).selectOption("transition");
  await expect(page.getByLabel("Animation", { exact: true }).locator("option")).toHaveCount(1);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Chapter", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
  await expect(page.getByRole("button", { name: "▷ Preview", exact: true })).toBeEnabled();
  await expect(page.locator(".preview-slot .prose")).toContainText("The first time");
  await page.getByRole("button", { name: "Continue reading", exact: true }).click();
  await expect(page.locator(".preview-slot .prose")).toContainText("On the back");
  await appendInk(page, "\n// Editing beside the preview\n");
  await expect(page.locator(".preview-slot .prose")).toContainText("On the back");
  await page.getByRole("button", { name: "Close preview", exact: true }).click();
  await expect(page.locator(".preview-slot")).toHaveCount(0);
});

test("retains the entire Inky Web menu, inserts a tunnel and exposes editable media and settings", async ({
  page,
}) => {
  await openHouseEditor(page);
  await page.getByText("Additional Commands", { exact: true }).click();
  await page.getByText("Full stories", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pontoon Game (from Overboard!)", exact: true }),
  ).toBeVisible();
  await page.getByText("Additional Commands", { exact: true }).click();
  await page.locator(".ace_text-input").focus();
  await page.keyboard.press("Control+End");
  await page.getByRole("button", { name: "Tunnel", exact: true }).click();
  await page.getByLabel("Destination Knot or Stitch").fill("dream_sequence");
  await page.getByLabel("Create destination Knot").check();
  await page.getByRole("button", { name: "Insert Tunnel", exact: true }).click();
  await expect.poll(() => script(page)).toContain("-> dream_sequence ->");
  await expect.poll(() => script(page)).toContain("->->");
  await page.getByRole("tab", { name: "Story Outline", exact: true }).click();
  await page
    .locator(".editor-outline")
    .getByRole("button", { name: /intro.*Knot/ })
    .click();
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  await page.getByRole("button", { name: "Image", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Add Image" })).toBeVisible();
  await page.getByRole("button", { name: "Choose an image", exact: true }).click();
  await page.getByLabel("Search pictures", { exact: true }).fill("house.night");
  await page.locator('.image-picker button[data-asset="house.night"]').click();
  // Pass 11: the description is in its own section, with a plain label.
  await page
    .locator(".image-section > summary")
    .filter({ hasText: /^Description/ })
    .click();
  await page
    .getByLabel("Description (not shown, read aloud by screen readers)")
    .fill("A girl standing beside a house");
  await page.getByRole("button", { name: "Apply Image", exact: true }).click();
  await page.getByRole("tab", { name: "Scene Media", exact: true }).click();
  await expect(page.locator(".editor-outline")).toContainText("intro.image-");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Game Mode", { exact: true }).selectOption("narrative");
  const settings = page.getByRole("dialog", { name: "Story Settings", exact: true });
  await expect(settings.getByLabel("Custom page color", { exact: true })).toHaveValue(
    browserHouseProject.languages.en!.defaults.backgroundColor ?? "#f5ead7",
  );
  await settings.getByLabel("Custom page color", { exact: true }).fill("#131313");
  await page.getByRole("button", { name: "Apply settings" }).click();
  await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
  await expect(page.locator(".preview-slot .reader")).toHaveCSS(
    "background-color",
    "rgb(19, 19, 19)",
  );
  await expect(page.getByRole("tab", { name: "Game", exact: true })).toHaveCount(0);
});

test("the preview follows typing in its final state, with instant text, its scroll and the caret", async ({
  page,
}) => {
  await withHouseProject(page);
  await fakeSpeech(page);
  const long = Array.from(
    { length: 14 },
    (_, index) =>
      `Paragraph ${index + 1} is long enough to take a while to type out, letter by letter, in a progressive story.`,
  ).join("\n");
  await openTypographyStory(page, true, long, "progressive");
  // Full playback (▷ Preview) still narrates; text is never typed out in the editor.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect
    .poll(async () => (await spokenTexts(page)).join(" "))
    .toContain("A BOOM, then silence.");
  const before = (await spokenTexts(page)).length;
  await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
  // The new preview has replaced the previous one once it narrates its page again.
  await expect.poll(async () => (await spokenTexts(page)).length).toBeGreaterThan(before);
  const voices = (await spokenTexts(page)).length;
  const last = page.locator(".preview-slot .prose p").filter({ hasText: "Paragraph 14" });
  await expect(last.locator("[aria-hidden]")).toHaveText(/in a progressive story\.$/, {
    timeout: 1000,
  });
  // The text's own frame scrolls on a computer; on a phone, the whole preview does.
  const board = page.locator(".preview-slot .reader-board");
  const boardScrolls = await board.evaluate((node) => node.scrollHeight > node.clientHeight + 100);
  const scroller = boardScrolls ? board : page.locator(".preview-slot .experience-preview");
  await scroller.evaluate((node) => (node.scrollTop = 240));
  const top = await scroller.evaluate((node) => node.scrollTop);
  expect(top).toBeGreaterThan(100);
  // Type at the end of the first line: no click on Preview.
  await findInInk(page, "silence.");
  const input = page.locator(".ace_text-input");
  await input.press("End");
  await input.pressSequentially(" Hello");
  await expect(page.locator(".preview-slot .prose")).toContainText("A BOOM, then silence. Hello");
  await expect(input).toBeFocused();
  await input.pressSequentially(" world");
  await expect.poll(() => script(page)).toContain("A BOOM, then silence. Hello world");
  await expect(page.locator(".preview-slot .prose")).toContainText("silence. Hello world");
  // The refreshed page is settled: same scroll, nothing spoken again, text complete.
  await expect.poll(() => scroller.evaluate((node) => node.scrollTop)).toBeCloseTo(top, -1);
  await page.waitForTimeout(700);
  expect(await spokenTexts(page)).toHaveLength(voices);
  await expect(last.locator("[aria-hidden]")).toHaveText(/in a progressive story\.$/);
  // The preview offers no "Text display" choice.
  await page.locator(".preview-slot").getByRole("button", { name: "Reading preferences" }).click();
  await expect(
    page.locator(".preview-slot").getByRole("combobox", { name: "Text size" }),
  ).toBeVisible();
  await expect(
    page.locator(".preview-slot").getByRole("combobox", { name: "Text display" }),
  ).toHaveCount(0);
});

test("a compile error while typing keeps the last preview and shows in the status bar", async ({
  page,
}) => {
  await withHouseProject(page);
  await openTypographyStory(page);
  await findInInk(page, "silence.");
  const input = page.locator(".ace_text-input");
  await input.press("End");
  await input.press("Enter");
  await input.pressSequentially("-> nowhere");
  await expect(page.locator(".editor-status")).toContainText("1 issue(s)");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(page.locator(".preview-slot .prose")).toContainText("A BOOM, then silence.");
  await expect(input).toBeFocused();
  for (let index = 0; index < "-> nowhere".length; index++) await input.press("Backspace");
  await expect(page.locator(".editor-status")).toContainText("No reported issues");
});

test("edits game rules, definitions and a combat action together, which enables combat", async ({
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
  // A combat action turns the story's game mode on.
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Game Mode", { exact: true })).toHaveValue("with-combat");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
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
  // A global variable goes at the top of the script, out of view: read the script itself.
  await expect.poll(() => script(page)).toMatch(/^VAR /);
  await page.getByRole("tab", { name: "Game", exact: true }).click();
  await page.getByRole("button", { name: "Character", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Character configuration", exact: true }),
  ).toBeVisible();
});
