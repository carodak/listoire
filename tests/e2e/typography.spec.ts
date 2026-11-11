import { expect, test } from "./test.ts";
import type { Page } from "@playwright/test";
import { defaultReadingPreferences } from "../../src/contracts/presentation.ts";
import { compileProject } from "../../src/features/editor/compiler.ts";
import { StoryProjectSchema } from "../../src/contracts/editor-project.ts";
test.setTimeout(60_000);

/** The small test story: "A BOOM, then silence.", then `extra` lines, then two more pages. */
function typographyProject(
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

async function openTypographyStory(page: Page, ...options: Parameters<typeof typographyProject>) {
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

/** A device voice that records what it speaks (and holds it while paused). */
async function fakeSpeech(page: Page) {
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
}
const spoken = (page: Page) =>
  page.evaluate(() => (window as unknown as { spoken: string[] }).spoken);

// Ace soft-wraps long lines, which adds spaces to the rendered script.
const shoutedBoom = /<typo style="shout" direction="diagonal-up" spacing="wide"\s*>BOOM<\/typo>/;

test("formats selected words, previews on hover and retains typography through undo, save and reload", async ({
  page,
}) => {
  await openTypographyStory(page);
  await page.getByLabel("Find in Ink", { exact: true }).fill("BOOM");
  await page.getByLabel("Find in Ink", { exact: true }).press("Enter");
  await page.getByLabel("Close search", { exact: true }).click();
  await page.getByRole("tab", { name: "Text", exact: true }).click();
  await page.locator(".text-style-menu summary").click();
  const shout = page.getByRole("button", { name: /^Shout/ });
  // Pass 8: the small sample is gone; each preset previews itself, drawn in its own style,
  // before it is applied, and hovering changes nothing in the script.
  await shout.hover();
  await expect(shout.locator(".type-style-shout")).toHaveText("Shout");
  await expect(page.locator(".ace_content")).not.toContainText("<typo");
  await shout.click();
  // Each change applies at once to the selected words, without an Apply step.
  await page.locator(".text-more summary").click();
  await page.getByLabel("Direction", { exact: true }).selectOption("diagonal-up");
  await page.getByLabel("Spacing", { exact: true }).selectOption("wide");
  await expect(page.locator(".ace_content")).toContainText(shoutedBoom);
  await expect(page.locator(".text-summary")).toHaveText(
    "Shout sets: Huge · Sans-serif · Crimson · Bold. Your changes: Diagonal up · Wide spacing.",
  );
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
  // One undo step per change (preset, direction, spacing).
  for (let step = 0; step < 3; step++)
    await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".ace_content")).not.toContainText("<typo");
  for (let step = 0; step < 3; step++)
    await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.locator(".ace_content")).toContainText(shoutedBoom);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".editor-status")).toContainText(/Saved|Published/);
  await page.reload();
  await expect(page.locator(".preview-slot .type-style-shout")).toHaveText("BOOM");
  await page.screenshot({ path: ".fallow/typography-editor.png" });
});

/** The script as stored, not as Ace renders it (soft wrap adds spaces). */
const script = (page: Page) =>
  page
    .locator(".ink-editor")
    .evaluate((node) =>
      (node as unknown as { env: { editor: { getValue(): string } } }).env.editor.getValue(),
    );

async function selectBoom(page: Page) {
  await page.getByLabel("Find in Ink", { exact: true }).fill("BOOM");
  await page.getByLabel("Find in Ink", { exact: true }).press("Enter");
  await page.getByLabel("Close search", { exact: true }).click();
  await page.getByRole("tab", { name: "Text", exact: true }).click();
}

test("one setting keeps the others; a preset clears manual changes and undo restores them", async ({
  page,
}) => {
  await openTypographyStory(page);
  await selectBoom(page);
  await page.locator(".text-style-menu summary").click();
  await page.getByRole("button", { name: /^Shout/ }).click();
  await page.getByLabel("Size", { exact: true }).selectOption("large");
  await page.getByRole("button", { name: "Italic", exact: true }).click();
  // Shout stays: only size and italic changed.
  await expect
    .poll(() => script(page))
    .toContain('<typo style="shout" size="large" italic="on">BOOM</typo>');
  await expect(page.getByRole("button", { name: "Italic", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  // Shout already makes it bold: the button shows it, and the font shows where it comes from.
  await expect(page.getByRole("button", { name: "Bold", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByLabel("Font", { exact: true }).locator("option:checked")).toHaveText(
    "Sans-serif (from Shout)",
  );
  await expect(page.locator(".text-setting.changed")).toHaveCount(1); // size
  // A value Shout doesn't set reads plainly, not "(from Shout)".
  await page.locator(".text-more summary").click();
  await expect(page.getByLabel("Direction", { exact: true }).locator("option:checked")).toHaveText(
    "Horizontal",
  );
  await page.locator(".text-more summary").click();
  await expect(page.locator(".text-summary")).toHaveText(
    "Shout sets: Huge · Sans-serif · Crimson · Bold. Your changes: Large · Italic.",
  );
  // Choosing a preset gives exactly that preset; undo brings the manual changes back.
  await page.locator(".text-style-menu summary").click();
  await page.getByRole("button", { name: /^Mystery/ }).click();
  await expect.poll(() => script(page)).toContain('<typo style="mystery">BOOM</typo>');
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect
    .poll(() => script(page))
    .toContain('<typo style="shout" size="large" italic="on">BOOM</typo>');
  // Undo puts the caret back at its column, now inside the longer tag: select the word again.
  await selectBoom(page);
  await page.getByRole("button", { name: "Clear formatting" }).click();
  await expect.poll(() => script(page)).toContain("A BOOM, then silence.");
  expect(await script(page)).not.toContain("<typo");
  await expect(page.locator(".text-summary")).toHaveText("No style. No manual changes.");
});

/** The caret's line in the script, with a "|" at the caret. */
const caretLine = (page: Page) =>
  page.locator(".ink-editor").evaluate((node) => {
    const editor = (
      node as unknown as {
        env: {
          editor: {
            getCursorPosition(): { row: number; column: number };
            session: { getLine(row: number): string };
          };
        };
      }
    ).env.editor;
    const { row, column } = editor.getCursorPosition();
    const line = editor.session.getLine(row);
    return `${line.slice(0, column)}|${line.slice(column)}`;
  });

test("after Undo leaves the caret inside a tag, formatting takes the whole tagged words", async ({
  page,
}) => {
  await openTypographyStory(page);
  await selectBoom(page);
  await page.locator(".text-style-menu summary").click();
  await page.getByRole("button", { name: /^Shout/ }).click();
  await page.getByLabel("Size", { exact: true }).selectOption("large");
  await page.getByRole("button", { name: "Italic", exact: true }).click();
  await page.locator(".text-style-menu summary").click();
  await page.getByRole("button", { name: /^Mystery/ }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect
    .poll(() => script(page))
    .toContain('<typo style="shout" size="large" italic="on">BOOM</typo>');
  // The caret is back at its old column, now inside the longer opening tag.
  expect(await caretLine(page)).toMatch(/<typo [^>|]*\|[^>]*>BOOM/);
  // The toolbar shows those words' settings, and a button formats all of them at once.
  await expect(page.getByRole("button", { name: "Italic", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Underline", exact: true }).click();
  await expect
    .poll(() => script(page))
    .toContain('<typo style="shout" size="large" italic="on" underline="on">BOOM</typo>');
  await expect(page.locator(".text-toolbar [role=status]")).toHaveCount(0);
  // The same from the keyboard, with the caret inside the closing tag.
  await page.locator(".ink-editor").evaluate((node) => {
    const editor = (
      node as unknown as {
        env: {
          editor: {
            getCursorPosition(): { row: number };
            session: { getLine(row: number): string };
            clearSelection(): void;
            moveCursorTo(row: number, column: number): void;
          };
        };
      }
    ).env.editor;
    const { row } = editor.getCursorPosition();
    editor.clearSelection();
    editor.moveCursorTo(row, editor.session.getLine(row).indexOf("</typo>") + 3);
  });
  expect(await caretLine(page)).toContain("BOOM</t|ypo>");
  await page.locator(".ace_text-input").press("Control+i");
  await expect
    .poll(() => script(page))
    .toContain('<typo style="shout" size="large" underline="on">BOOM</typo>');
});

test("keyboard shortcuts format the word at the caret and open find and replace", async ({
  page,
}) => {
  await openTypographyStory(page);
  await selectBoom(page);
  const input = page.locator(".ace_text-input");
  await input.press("ArrowLeft"); // caret inside "BOOM", nothing selected
  await input.press("ArrowRight");
  await input.press("ArrowRight");
  await input.press("Control+b");
  await expect.poll(() => script(page)).toContain('<typo bold="on">BOOM</typo>');
  await input.press("Control+u"); // underline, not Ace's "to upper case"
  await expect.poll(() => script(page)).toContain('<typo bold="on" underline="on">BOOM</typo>');
  await input.press("Control+Shift+X");
  await input.press("Control+i");
  await expect
    .poll(() => script(page))
    .toContain('<typo bold="on" italic="on" underline="on" strike="on">BOOM</typo>');
  await expect(page.getByRole("button", { name: "Strikethrough" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await input.press("Control+\\");
  await expect.poll(() => script(page)).toContain("A BOOM, then silence.");
  await page.getByRole("button", { name: "Bold", exact: true }).focus();
  await page.keyboard.press("Control+h");
  await expect(page.locator(".ace_search")).toBeVisible();
  await expect(page.locator(".ace_search .ace_replace_form")).toBeVisible();
});

test("a shortcut that can't format says why, in the toolbar or the status bar, in French too", async ({
  page,
}) => {
  await openTypographyStory(page);
  await selectBoom(page);
  const input = page.locator(".ace_text-input");
  await input.press("Control+Home"); // "-> start": an Ink instruction
  await input.press("Control+b");
  const status = page.locator(".text-toolbar").getByRole("status");
  await expect(status).toHaveText("Select story words, not an Ink instruction or tag.");
  expect(await script(page)).not.toContain("<typo");
  // Moving to other words hides the message, as with the toolbar's buttons.
  await selectBoom(page);
  await expect(status).toHaveCount(0);
  // With the Text toolbar hidden, the status bar says it.
  await page.getByRole("tab", { name: "Story", exact: true }).click();
  await input.press("Control+Home");
  await input.press("Control+i");
  await expect(page.locator(".editor-status [role=status]")).toHaveText(
    "Select story words, not an Ink instruction or tag.",
  );
  // In French.
  await page.goto("/");
  await page.getByRole("button", { name: "Language: English", exact: true }).click();
  await page.getByRole("button", { name: "Français", exact: true }).click();
  await openTypographyStory(page);
  await selectBoom(page);
  await page.locator(".ace_text-input").press("Control+Home");
  await page.locator(".ace_text-input").press("Control+\\");
  await expect(page.locator(".text-toolbar").getByRole("status")).toHaveText(
    "Sélectionnez des mots du récit, pas une instruction ni une balise Ink.",
  );
});

test("any color from the picker, named swatches, and a contrast warning for light and dark pages", async ({
  page,
}) => {
  await openTypographyStory(page);
  await selectBoom(page);
  const menu = page.locator(".text-color");
  const pick = async (color: string) => {
    await menu.locator("summary").click();
    await menu.locator("input[type=color]").fill(color);
  };
  const warning = page.locator(".text-toolbar .text-warning");
  // The story's page is the default dark one: dark grey words would be hard to read.
  await pick("#222222");
  await expect.poll(() => script(page)).toContain('<typo color="222222">BOOM</typo>');
  await expect(warning).toContainText("Low contrast with this story's page color (1.");
  await expect(menu.locator("summary")).toHaveAttribute("aria-label", "Color: #222222");
  await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
  await expect(page.locator(".preview-slot .prose .type-color-custom")).toHaveCSS(
    "color",
    "rgb(34, 34, 34)",
  );
  // A named colour is one click and adapts to the page: no warning.
  await menu.locator("summary").click();
  await page.getByRole("button", { name: "Ocean", exact: true }).click();
  await expect.poll(() => script(page)).toContain('<typo color="ocean">BOOM</typo>');
  await expect(warning).toHaveCount(0);
  await expect(page.locator(".preview-slot .prose .type-color-ocean")).toHaveText("BOOM");
  // On a light page, dark grey reads well and pale yellow does not.
  await openTypographyStory(page, false, "", "instant", "#f4ecd8");
  await selectBoom(page);
  await pick("#222222");
  await expect.poll(() => script(page)).toContain('<typo color="222222">BOOM</typo>');
  await expect(warning).toHaveCount(0);
  await pick("#ffff66");
  await expect.poll(() => script(page)).toContain('<typo color="ffff66">BOOM</typo>');
  await expect(warning).toBeVisible();
});

/** Font size of the words, relative to their paragraph's. */
const sizeRatio = (word: import("@playwright/test").Locator) =>
  word.evaluate(
    (node) =>
      parseFloat(getComputedStyle(node).fontSize) /
      parseFloat(getComputedStyle(node.closest("p")!).fontSize),
  );

test("point sizes from the list or typed, following the reader's text size", async ({ page }) => {
  await openTypographyStory(page);
  await selectBoom(page);
  await page.getByLabel("Size", { exact: true }).selectOption("24pt");
  await expect.poll(() => script(page)).toContain('<typo size="24pt">BOOM</typo>');
  await expect(page.getByLabel("Point size", { exact: true })).toHaveValue("24");
  await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
  const word = page.locator(".preview-slot .prose .type-size-points");
  // 12 pt is the reader's text size, so 24 pt is twice the paragraph's size, whatever it is.
  expect(await sizeRatio(word)).toBeCloseTo(2, 1);
  const before = parseFloat(await word.evaluate((node) => getComputedStyle(node).fontSize));
  await page.locator(".preview-slot").getByRole("button", { name: "Reading preferences" }).click();
  await page
    .locator(".preview-slot")
    .getByRole("combobox", { name: "Text size" })
    .selectOption("large");
  await expect
    .poll(async () => parseFloat(await word.evaluate((node) => getComputedStyle(node).fontSize)))
    .toBeGreaterThan(before);
  expect(await sizeRatio(word)).toBeCloseTo(2, 1);
  // Any whole size can be typed; the list then shows it.
  const typed = page.getByLabel("Point size", { exact: true });
  await typed.fill("13");
  await typed.press("Enter");
  await expect.poll(() => script(page)).toContain('<typo size="13pt">BOOM</typo>');
  await expect(page.getByLabel("Size", { exact: true }).locator("option:checked")).toHaveText(
    "13 pt",
  );
  // Out of range: nothing changes and the toolbar says why.
  await page.getByLabel("Point size", { exact: true }).fill("60");
  await page.getByLabel("Point size", { exact: true }).press("Enter");
  await expect(page.locator(".text-toolbar").getByRole("status")).toHaveText(
    "Type a whole point size from 8 to 48.",
  );
  expect(await script(page)).toContain('<typo size="13pt">BOOM</typo>');
  // The named sizes stay quick choices.
  await page.getByLabel("Size", { exact: true }).selectOption("huge");
  await expect.poll(() => script(page)).toContain('<typo size="huge">BOOM</typo>');
  // Keys that apply a setting never reach the script (they would replace the words).
  await page.getByRole("button", { name: "Bold", exact: true }).press("Enter");
  await expect.poll(() => script(page)).toContain('<typo size="huge" bold="on">BOOM</typo>');
  await page.getByRole("button", { name: "Italic", exact: true }).press("Space");
  await expect
    .poll(() => script(page))
    .toContain('<typo size="huge" bold="on" italic="on">BOOM</typo>');
  expect(await script(page)).toContain("A <typo");
});

test("on a phone, a 48 pt word shrinks to fit the column", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const project = StoryProjectSchema.parse(
    typographyProject(false, 'A <typo size="48pt">Extraordinarily</typo> long word.'),
  );
  const bundle = (await compileProject(project)).en!;
  await page.route("**/stories/house/en.json", (route) => route.fulfill({ json: bundle }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Play an existing story", exact: true }).click();
  const word = page.locator(".prose .type-size-points");
  await expect(word).toHaveText("Extraordinarily");
  // Uncapped it would be 4 times the text size; here it is smaller, and stays inside.
  expect(await sizeRatio(word)).toBeLessThan(3);
  const fits = await word.evaluate((node) => {
    const paragraph = node.closest("p")!.getBoundingClientRect();
    const box = node.getBoundingClientRect();
    return box.left >= paragraph.left - 1 && box.right <= paragraph.right + 1;
  });
  expect(fits).toBe(true);
  expect(await word.evaluate((node) => node.getClientRects().length)).toBe(1); // not broken
});

test("aligns the paragraph at the caret, shown in the reader, with French labels", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Language: English", exact: true }).click();
  await page.getByRole("button", { name: "Français", exact: true }).click();
  await openTypographyStory(page);
  await selectBoom(page);
  const tools = page.getByRole("group", { name: "Mise en forme du texte" });
  await expect(tools.getByRole("button", { name: "Gras", exact: true })).toBeVisible();
  await expect(tools.getByRole("button", { name: "Aligner à gauche" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await tools.getByRole("button", { name: "Centrer", exact: true }).click();
  await expect.poll(() => script(page)).toContain("A BOOM, then silence. # align:center");
  await expect(tools.getByRole("button", { name: "Centrer", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
  await expect(page.locator(".preview-slot .prose p").filter({ hasText: "A BOOM" })).toHaveCSS(
    "text-align",
    "center",
  );
  await tools.getByRole("button", { name: "Aligner à gauche" }).click();
  await expect.poll(() => script(page)).toContain("A BOOM, then silence.\n");
  expect(await script(page)).not.toContain("align:");
  // A line that is not a paragraph explains itself, in French.
  await page.locator(".ace_text-input").press("Control+Home");
  await tools.getByRole("button", { name: "Centrer", exact: true }).click();
  await expect(tools.getByRole("status")).toHaveText(
    "Placez le curseur dans un paragraphe du récit.",
  );
});

test("the preview follows typing in its final state, with instant text, its scroll and the caret", async ({
  page,
}) => {
  await fakeSpeech(page);
  const long = Array.from(
    { length: 14 },
    (_, index) =>
      `Paragraph ${index + 1} is long enough to take a while to type out, letter by letter, in a progressive story.`,
  ).join("\n");
  await openTypographyStory(page, true, long, "progressive");
  // Full playback (▷ Preview) still narrates; text is never typed out in the editor.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect.poll(async () => (await spoken(page)).join(" ")).toContain("A BOOM, then silence.");
  const before = (await spoken(page)).length;
  await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
  // The new preview has replaced the previous one once it narrates its page again.
  await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(before);
  const voices = (await spoken(page)).length;
  const last = page.locator(".preview-slot .prose p").filter({ hasText: "Paragraph 14" });
  await expect(last.locator("[aria-hidden]")).toHaveText(/in a progressive story\.$/, {
    timeout: 1000,
  });
  const scroller = page.locator(".preview-slot .reader-board");
  await scroller.evaluate((node) => (node.scrollTop = 240));
  const top = await scroller.evaluate((node) => node.scrollTop);
  expect(top).toBeGreaterThan(100);
  // Type at the end of the first line: no click on Preview.
  await page.getByLabel("Find in Ink", { exact: true }).fill("silence.");
  await page.getByLabel("Find in Ink", { exact: true }).press("Enter");
  await page.getByLabel("Close search", { exact: true }).click();
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
  expect(await spoken(page)).toHaveLength(voices);
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
  await openTypographyStory(page);
  await page.getByLabel("Find in Ink", { exact: true }).fill("silence.");
  await page.getByLabel("Find in Ink", { exact: true }).press("Enter");
  await page.getByLabel("Close search", { exact: true }).click();
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

test("starts narration on every following page after pause, cancel and replay", async ({
  page,
}) => {
  await fakeSpeech(page);
  await openTypographyStory(page, true);
  await expect.poll(() => spoken(page)).toContain("A BOOM, then silence.");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: /Continue$/ }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect.poll(() => spoken(page)).toContain("The next page begins.");
  await page.getByRole("button", { name: /Continue again$/ }).click();
  await expect.poll(() => spoken(page)).toContain("The final page begins.");
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

test("aligns each paragraph on its own; unaligned text stays left with its drop cap", async ({
  page,
}) => {
  await openTypographyStory(
    page,
    false,
    "Centred words. # align:center\nRight words. # align:right\nJustified words. # align:justify",
  );
  const paragraph = (text: string) =>
    page.locator(".preview-slot .prose p").filter({ hasText: text });
  await expect(paragraph("A BOOM")).toHaveCSS("text-align", "start");
  await expect(paragraph("A BOOM")).not.toHaveAttribute("data-align");
  const dropCap = (text: string) =>
    paragraph(text)
      .locator("[aria-hidden]")
      .evaluate((node) => getComputedStyle(node, "::first-letter").float);
  expect(await dropCap("A BOOM")).toBe("left");
  await expect(paragraph("Centred")).toHaveCSS("text-align", "center");
  await expect(paragraph("Right")).toHaveCSS("text-align", "right");
  await expect(paragraph("Justified")).toHaveCSS("text-align", "justify");
  await expect(page.locator(".preview-slot .prose .sr-only").nth(1)).toHaveText("Centred words.");
});

test("keeps preset weights and renders bold, italic, underline and strikethrough", async ({
  page,
}) => {
  await openTypographyStory(
    page,
    false,
    '<typo style="shout">S</typo> <typo style="impact">I</typo> <typo style="whisper">W</typo> <typo bold="on">B</typo> <typo italic="on">It</typo> <typo underline="on">U</typo> <typo strike="on">X</typo> <typo underline="on" strike="on">UX</typo> <typo style="whisper" italic="off">Wo</typo> <typo style="shout" bold="off">So</typo>.',
  );
  const prose = page.locator(".preview-slot .prose");
  const word = (text: string) =>
    prose.locator(".narrative-type").filter({ hasText: new RegExp(`^${text}$`) });
  // Stories written before these settings render exactly as before.
  await expect(word("S")).toHaveCSS("font-weight", "900");
  await expect(word("I")).toHaveCSS("font-weight", "900");
  await expect(word("W")).toHaveCSS("font-style", "italic");
  await expect(word("B")).toHaveCSS("font-weight", "700");
  await expect(word("It")).toHaveCSS("font-style", "italic");
  await expect(word("U")).toHaveCSS("text-decoration-line", "underline");
  await expect(word("X")).toHaveCSS("text-decoration-line", "line-through");
  await expect(word("UX")).toHaveCSS("text-decoration-line", "underline line-through");
  await expect(word("Wo")).toHaveCSS("font-style", "normal");
  await expect(word("So")).toHaveCSS("font-weight", "400");
  await expect(prose.locator(".sr-only").last()).toHaveText("S I W B It U X UX Wo So.");
});
