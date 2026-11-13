import { expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { browserHouseProject } from "../fixtures/house-project.ts";

/** Helpers for the Story Editor: its Ink script, its search, its backups and imports. */

/** Serves the small house project in place of Orée's. */
export const withHouseProject = (page: Page) =>
  page.route("**/stories/house/project.json", (route) =>
    route.fulfill({ json: browserHouseProject }),
  );

/** Opens the editor on the house project, motion reduced. */
export async function openHouseEditor(page: Page) {
  await withHouseProject(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/editor");
  await expect(page.getByLabel("Ink script editor")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".ace_text-input")).toHaveCount(1);
  await expect(page.getByLabel("Story title", { exact: true })).toHaveValue(
    "The House That Remembered",
  );
}

/** Adds `text` at the end of the script. */
export async function appendInk(page: Page, text: string) {
  await page.locator(".ace_text-input").focus();
  await page.keyboard.press("Control+End");
  await page.keyboard.insertText(text);
}

type Ace = {
  getValue(): string;
  clearSelection(): void;
  gotoLine(row: number, column: number): void;
  focus(): void;
};

/** The script as stored, not as Ace renders it (soft wrap adds spaces). */
export const script = (page: Page) =>
  page
    .locator(".ink-editor")
    .evaluate((node) => (node as unknown as { env: { editor: Ace } }).env.editor.getValue());

/** Puts the script's caret at the start of the first line containing `text` (or `offset` lines below). */
export async function caretTo(page: Page, text: string, offset = 0) {
  await page.locator(".ink-editor").evaluate(
    (node, [text, offset]) => {
      const editor = (node as unknown as { env: { editor: Ace } }).env.editor;
      const row = editor
        .getValue()
        .split("\n")
        .findIndex((line) => line.includes(text as string));
      if (row < 0) throw new Error(`No line contains ${text}`);
      editor.clearSelection();
      editor.gotoLine(row + 1 + (offset as number), 0);
      editor.focus();
    },
    [text, offset] as const,
  );
}

/** Finds `text` with the editor's search box, which selects it in the script. */
export async function findInInk(page: Page, text: string) {
  await page.getByLabel("Find in Ink", { exact: true }).fill(text);
  await page.getByLabel("Find in Ink", { exact: true }).press("Enter");
  await page.getByLabel("Close search", { exact: true }).click();
}

/** Downloads Export › Complete project backup and returns the project it holds. */
export async function backup(page: Page) {
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Complete project backup", exact: true }).click();
  return JSON.parse(await readFile((await (await download).path())!, "utf8"));
}

/** Imports a project file with Load / Import. */
export async function importProject(page: Page, project: unknown, name = "project.json") {
  await page.getByRole("button", { name: "Load / Import", exact: true }).click();
  await page.locator('input[type=file][accept=".ink,.json"]').setInputFiles({
    name,
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
}

/** Opens the full preview and waits until it has played its page. */
export async function preview(page: Page) {
  await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
  await expect(page.getByRole("button", { name: "▷ Preview", exact: true })).toBeEnabled();
}
