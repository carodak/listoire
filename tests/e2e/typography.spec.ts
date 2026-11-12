import { expect, test } from "./test.ts";
import type { Locator, Page } from "@playwright/test";
import { compileProject } from "../../src/features/editor/compiler.ts";
import { StoryProjectSchema } from "../../src/contracts/editor-project.ts";
import { openTypographyStory, script, typographyProject } from "./typography-story.ts";
test.setTimeout(90_000);

// Ace soft-wraps long lines, which adds spaces to the rendered script.
const shoutedBoom = /<typo style="shout" direction="diagonal-up" spacing="wide"\s*>BOOM<\/typo>/;

async function selectBoom(page: Page) {
  await page.getByLabel("Find in Ink", { exact: true }).fill("BOOM");
  await page.getByLabel("Find in Ink", { exact: true }).press("Enter");
  await page.getByLabel("Close search", { exact: true }).click();
  await page.getByRole("tab", { name: "Text", exact: true }).click();
}

async function clearBoom(page: Page) {
  await selectBoom(page);
  await page.getByRole("button", { name: "Clear formatting" }).click();
  await expect.poll(() => script(page)).toContain("A BOOM, then silence.");
  expect(await script(page)).not.toContain("<typo");
  await expect(page.locator(".text-summary")).toHaveText("No style. No manual changes.");
}

/** Picks any colour with the toolbar's colour picker. */
async function pickColor(page: Page, color: string) {
  const menu = page.locator(".text-color");
  await menu.locator("summary").click();
  // What a browser does when its colour picker closes (WebKit ignores fill() on this input).
  await menu.locator("input[type=color]").evaluate((input: HTMLInputElement, color) => {
    input.value = color;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, color);
  return menu;
}

/** The caret's line in the script, with a "|" at the caret. */
const caretLine = (page: Page) =>
  page.locator(".ink-editor").evaluate((node) => {
    type Ace = {
      getCursorPosition(): { row: number; column: number };
      session: { getLine(row: number): string };
    };
    const editor = (node as unknown as { env: { editor: Ace } }).env.editor;
    const { row, column } = editor.getCursorPosition();
    const line = editor.session.getLine(row);
    return `${line.slice(0, column)}|${line.slice(column)}`;
  });

/** Moves the caret inside "</typo>" on its line. */
const caretIntoClosingTag = (page: Page) =>
  page.locator(".ink-editor").evaluate((node) => {
    type Ace = {
      getCursorPosition(): { row: number };
      session: { getLine(row: number): string };
      clearSelection(): void;
      moveCursorTo(row: number, column: number): void;
    };
    const editor = (node as unknown as { env: { editor: Ace } }).env.editor;
    const { row } = editor.getCursorPosition();
    editor.clearSelection();
    editor.moveCursorTo(row, editor.session.getLine(row).indexOf("</typo>") + 3);
  });

/** On the default dark page: any colour, a contrast warning, then a named colour. */
async function colorsOnADarkPage(page: Page) {
  await selectBoom(page);
  const warning = page.locator(".text-toolbar .text-warning");
  const menu = await pickColor(page, "#222222");
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
  await clearBoom(page);
}

/** Point sizes from the list or typed; an out-of-range size; keys that never reach the script. */
async function pointSizes(page: Page) {
  await selectBoom(page);
  await page.getByLabel("Size", { exact: true }).selectOption("24pt");
  await expect.poll(() => script(page)).toContain('<typo size="24pt">BOOM</typo>');
  await expect(page.getByLabel("Point size", { exact: true })).toHaveValue("24");
  const typed = page.getByLabel("Point size", { exact: true });
  await typed.fill("13");
  await typed.press("Enter");
  await expect.poll(() => script(page)).toContain('<typo size="13pt">BOOM</typo>');
  await expect(page.getByLabel("Size", { exact: true }).locator("option:checked")).toHaveText(
    "13 pt",
  );
  await typed.fill("60");
  await typed.press("Enter");
  await expect(page.locator(".text-toolbar").getByRole("status")).toHaveText(
    "Type a whole point size from 8 to 48.",
  );
  expect(await script(page)).toContain('<typo size="13pt">BOOM</typo>');
  await page.getByLabel("Size", { exact: true }).selectOption("huge");
  await expect.poll(() => script(page)).toContain('<typo size="huge">BOOM</typo>');
  await page.getByRole("button", { name: "Bold", exact: true }).press("Enter");
  await expect.poll(() => script(page)).toContain('<typo size="huge" bold="on">BOOM</typo>');
  await page.getByRole("button", { name: "Italic", exact: true }).press("Space");
  await expect
    .poll(() => script(page))
    .toContain('<typo size="huge" bold="on" italic="on">BOOM</typo>');
  expect(await script(page)).toContain("A <typo");
  await clearBoom(page);
}

/** One setting keeps the others; a preset replaces them; Undo brings them back. */
async function settingsAndPresets(page: Page) {
  await selectBoom(page);
  await page.locator(".text-style-menu summary").click();
  await page.getByRole("button", { name: /^Shout/ }).click();
  await page.getByLabel("Size", { exact: true }).selectOption("large");
  await page.getByRole("button", { name: "Italic", exact: true }).click();
  const kept = '<typo style="shout" size="large" italic="on">BOOM</typo>';
  await expect.poll(() => script(page)).toContain(kept);
  const pressed = (name: string) => page.getByRole("button", { name, exact: true });
  await expect(pressed("Italic")).toHaveAttribute("aria-pressed", "true");
  // Shout already makes it bold: the button shows it, and the font shows where it comes from.
  await expect(pressed("Bold")).toHaveAttribute("aria-pressed", "true");
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
  await page.locator(".text-style-menu summary").click();
  await page.getByRole("button", { name: /^Mystery/ }).click();
  await expect.poll(() => script(page)).toContain('<typo style="mystery">BOOM</typo>');
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(() => script(page)).toContain(kept);
}

/** After Undo the caret is inside the tag: formatting still takes the whole tagged words. */
async function formatFromInsideATag(page: Page) {
  expect(await caretLine(page)).toMatch(/<typo [^>|]*\|[^>]*>BOOM/);
  const button = (name: string) => page.getByRole("button", { name, exact: true });
  await expect(button("Italic")).toHaveAttribute("aria-pressed", "true");
  await button("Underline").click();
  await expect
    .poll(() => script(page))
    .toContain('<typo style="shout" size="large" italic="on" underline="on">BOOM</typo>');
  await expect(page.locator(".text-toolbar [role=status]")).toHaveCount(0);
  // The same from the keyboard, with the caret inside the closing tag.
  await caretIntoClosingTag(page);
  expect(await caretLine(page)).toContain("BOOM</t|ypo>");
  await page.locator(".ace_text-input").press("Control+i");
  await expect
    .poll(() => script(page))
    .toContain('<typo style="shout" size="large" underline="on">BOOM</typo>');
  await clearBoom(page);
}

/** Shortcuts format the word at the caret; Ctrl+H opens find and replace. */
async function shortcuts(page: Page) {
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
}

/** A shortcut that can't format says why: in the toolbar, or in the status bar without it. */
async function shortcutMessages(page: Page) {
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
  await page.getByRole("tab", { name: "Story", exact: true }).click();
  await input.press("Control+Home");
  await input.press("Control+i");
  await expect(page.locator(".editor-status [role=status]")).toHaveText(
    "Select story words, not an Ink instruction or tag.",
  );
}

/** A preset previews on hover, applies at once; the preview, Undo/Redo, save and reload keep it. */
async function presetToReload(page: Page) {
  await selectBoom(page);
  await page.locator(".text-style-menu summary").click();
  const shout = page.getByRole("button", { name: /^Shout/ });
  // Each preset previews itself, drawn in its own style; hovering changes nothing in the script.
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
}

test("an author formats words with the toolbar and the keyboard, and reads them in the preview", async ({
  page,
}) => {
  await openTypographyStory(page);
  await colorsOnADarkPage(page);
  await pointSizes(page);
  await settingsAndPresets(page);
  await formatFromInsideATag(page);
  await shortcuts(page);
  await shortcutMessages(page);
});

// Its own test: browser coverage keeps only the scripts of the page loaded last.
test("a preset previews on hover and survives the preview, Undo/Redo, save and reload", async ({
  page,
}) => {
  await openTypographyStory(page);
  await presetToReload(page);
});

test("in French, on a light page: messages, paragraph alignment and contrast warnings", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Language: English", exact: true }).click();
  await page.getByRole("button", { name: "Français", exact: true }).click();
  await openTypographyStory(page, false, "", "instant", "#f4ecd8");
  await selectBoom(page);
  const input = page.locator(".ace_text-input");
  await input.press("Control+Home");
  await input.press("Control+\\");
  const tools = page.getByRole("group", { name: "Mise en forme du texte" });
  await expect(tools.getByRole("status")).toHaveText(
    "Sélectionnez des mots du récit, pas une instruction ni une balise Ink.",
  );
  await selectBoom(page);
  await expect(tools.getByRole("button", { name: "Gras", exact: true })).toBeVisible();
  const left = tools.getByRole("button", { name: "Aligner à gauche" });
  const center = tools.getByRole("button", { name: "Centrer", exact: true });
  await expect(left).toHaveAttribute("aria-pressed", "true");
  await center.click();
  await expect.poll(() => script(page)).toContain("A BOOM, then silence. # align:center");
  await expect(center).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
  await expect(page.locator(".preview-slot .prose p").filter({ hasText: "A BOOM" })).toHaveCSS(
    "text-align",
    "center",
  );
  await left.click();
  await expect.poll(() => script(page)).toContain("A BOOM, then silence.\n");
  expect(await script(page)).not.toContain("align:");
  // A line that is not a paragraph explains itself.
  await input.press("Control+Home");
  await center.click();
  await expect(tools.getByRole("status")).toHaveText(
    "Placez le curseur dans un paragraphe du récit.",
  );
  // On a light page, dark grey reads well and pale yellow does not.
  await selectBoom(page);
  const warning = page.locator(".text-toolbar .text-warning");
  await pickColor(page, "#222222");
  await expect.poll(() => script(page)).toContain('<typo color="222222">BOOM</typo>');
  await expect(warning).toHaveCount(0);
  await pickColor(page, "#ffff66");
  await expect.poll(() => script(page)).toContain('<typo color="ffff66">BOOM</typo>');
  await expect(warning).toBeVisible();
});

/** Font size of the words, relative to their paragraph's. */
const sizeRatio = (word: Locator) =>
  word.evaluate(
    (node) =>
      parseFloat(getComputedStyle(node).fontSize) /
      parseFloat(getComputedStyle(node.closest("p")!).fontSize),
  );

const styledLines = [
  '<typo direction="vertical" color="forest">DOWN</typo> <typo style="falling">falling</typo> <typo style="wave">é👩🏽‍🚀a</typo> <typo style="handwritten">a secret</typo>.',
  "Centred words. # align:center",
  "Right words. # align:right",
  "Justified words. # align:justify",
  '<typo style="shout">S</typo> <typo style="impact">I</typo> <typo style="whisper">W</typo> <typo bold="on">B</typo> <typo italic="on">It</typo> <typo underline="on">U</typo> <typo strike="on">X</typo> <typo underline="on" strike="on">UX</typo> <typo style="whisper" italic="off">Wo</typo> <typo style="shout" bold="off">So</typo>.',
  'Twice as <typo size="24pt">big</typo>.',
  'A <typo size="48pt">Extraordinarily</typo> long word.',
].join("\n");

test("the reader renders every style, alignment and size, on a computer and on a phone", async ({
  page,
}) => {
  const bundle = (
    await compileProject(StoryProjectSchema.parse(typographyProject(false, styledLines)))
  ).en!;
  await page.route("**/stories/house/en.json", (route) => route.fulfill({ json: bundle }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Play an existing story", exact: true }).click();
  const prose = page.locator(".prose");
  const paragraph = (text: string) => prose.locator("p").filter({ hasText: text });
  const word = (text: string) =>
    prose.locator(".narrative-type").filter({ hasText: new RegExp(`^${text}$`) });
  // Directions, letter-by-letter styles and handwriting; screen readers get the plain words.
  await expect(prose.locator(".type-direction-vertical")).toHaveCSS("writing-mode", "vertical-rl");
  await expect(prose.locator(".type-style-wave .type-letter")).toHaveCount(3);
  await expect(prose.locator(".type-style-falling .type-letter")).toHaveCount(7);
  await expect(prose.locator(".type-font-handwritten")).toHaveCSS(
    "font-family",
    /Listoire Handwriting/,
  );
  await expect(paragraph("DOWN").locator(".sr-only")).toHaveText("DOWN falling é👩🏽‍🚀a a secret.");
  // Each paragraph aligns on its own; unaligned text stays left with its drop cap.
  await expect(paragraph("A BOOM")).toHaveCSS("text-align", "start");
  await expect(paragraph("A BOOM")).not.toHaveAttribute("data-align");
  const float = await paragraph("A BOOM")
    .locator("[aria-hidden]")
    .evaluate((node) => getComputedStyle(node, "::first-letter").float);
  expect(float).toBe("left");
  await expect(paragraph("Centred")).toHaveCSS("text-align", "center");
  await expect(paragraph("Right")).toHaveCSS("text-align", "right");
  await expect(paragraph("Justified")).toHaveCSS("text-align", "justify");
  await expect(paragraph("Centred").locator(".sr-only")).toHaveText("Centred words.");
  // Preset weights, and bold, italic, underline and strikethrough as before these settings.
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
  await expect(paragraph("UX").locator(".sr-only")).toHaveText("S I W B It U X UX Wo So.");
  // 12 pt is the reader's text size: 24 pt stays twice the paragraph's size at any text size.
  const big = paragraph("Twice").locator(".type-size-points");
  expect(await sizeRatio(big)).toBeCloseTo(2, 1);
  const before = parseFloat(await big.evaluate((node) => getComputedStyle(node).fontSize));
  await page.getByRole("button", { name: "Reading preferences" }).click();
  await page.getByRole("combobox", { name: "Text size" }).selectOption("large");
  await expect
    .poll(async () => parseFloat(await big.evaluate((node) => getComputedStyle(node).fontSize)))
    .toBeGreaterThan(before);
  expect(await sizeRatio(big)).toBeCloseTo(2, 1);
  // On a phone, a 48 pt word shrinks to fit the column, unbroken (uncapped it would be 4×).
  await page.setViewportSize({ width: 360, height: 740 });
  const long = paragraph("Extraordinarily").locator(".type-size-points");
  await expect(long).toHaveText("Extraordinarily");
  await expect.poll(() => sizeRatio(long)).toBeLessThan(3);
  const fits = await long.evaluate((node) => {
    const column = node.closest("p")!.getBoundingClientRect();
    const box = node.getBoundingClientRect();
    return box.left >= column.left - 1 && box.right <= column.right + 1;
  });
  expect(fits).toBe(true);
  expect(await long.evaluate((node) => node.getClientRects().length)).toBe(1); // not broken
});
