import { expect, test } from "./test.ts";
import type { Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { appendInk, backup, importProject, openHouseEditor, preview, script } from "./editor.ts";
import { readKeys, writeKey } from "./idb.ts";

test.beforeEach(async ({ page }) => {
  await openHouseEditor(page);
});

const savedStatus = (page: Page) =>
  expect(page.locator(".editor-status").getByRole("status")).toHaveText("Saved · reader updated", {
    timeout: 20_000,
  });

test("synchronizes story.json after deleting Ink scenes and retains it after reload", async ({
  page,
}) => {
  const ink = "-> start\n=== start ===\nA new beginning. # segment:start.one\n-> END";
  await page.locator(".ace_text-input").focus();
  await page.keyboard.press("Control+Home");
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(ink);
  const properties = async () => {
    await page.getByRole("button", { name: "⚙ story.json", exact: true }).click();
    const value = JSON.parse(
      await page.getByLabel("Properties JSON", { exact: true }).inputValue(),
    );
    await page.keyboard.press("Escape");
    return value;
  };
  expect((await properties()).scenes).toEqual({});
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect((await properties()).scenes.intro).toBeDefined();
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  expect((await properties()).scenes).toEqual({});
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByText("Draft saved · fix issues to update the reader", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Ink script editor")).toBeVisible();
  expect((await properties()).scenes).toEqual({});
  const saved = await backup(page);
  expect(saved.languages.en.configuration.scenes).toEqual({});
  expect(saved.languages.en.script).not.toContain("@media intro/");
});

test("refreshes an imported legacy project's artwork without losing the author's text", async ({
  page,
}) => {
  const legacy = JSON.parse(
    await readFile(resolve("docs/story-editor/original-project.json"), "utf8"),
  );
  legacy.languages.en.configuration.title = "My retained story";
  legacy.languages.en.script += "\n// My retained draft note\n";
  await importProject(page, legacy, "old-project.json");
  await expect(page.getByLabel("Story title", { exact: true })).toHaveValue("My retained story");
  await page.getByRole("button", { name: "▷ Preview", exact: true }).click();
  await expect(page.locator(".preview-slot .story-art .shot-plane-image")).toHaveAttribute(
    "src",
    /paper\.modern-male-character\.webp$/,
  );
  await expect(page.locator(".preview-slot .scene-illustration img").first()).toHaveAttribute(
    "src",
    /house\.night\.webp$/,
  );
  const saved = await backup(page);
  expect(saved.languages.en.script).toContain("My retained draft note");
  expect(saved.languages.en.configuration.title).toBe("My retained story");
});

test("edits both languages, undoes metadata, publishes a title and previews the actual reader", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await expect(page.getByRole("tab", { name: "Story", exact: true })).toBeVisible();
  await appendInk(page, "\n// Author note in English\n");
  await page.getByLabel("Story language", { exact: true }).selectOption("fr");
  await appendInk(page, "\n// Note en français\n");
  await page.getByLabel("Story language", { exact: true }).selectOption("en");
  // The note is at the end of the script, maybe out of view: read the script itself.
  await expect.poll(() => script(page)).toContain("// Author note in English");
  await page.getByLabel("Story title", { exact: true }).fill("The Photograph — edited");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Story title", { exact: true })).toHaveValue(
    "The House That Remembered",
  );
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.getByLabel("Story title", { exact: true })).toHaveValue(
    "The Photograph — edited",
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await savedStatus(page);
  await preview(page);
  await expect(page.locator(".experience-preview .prose")).toContainText(
    "The first time you saw the girl",
  );
  await page.getByRole("button", { name: "Continue reading", exact: true }).click();
  await expect(page.locator(".experience-preview .prose")).toContainText("On the back");
  await page.getByRole("button", { name: "Close preview" }).click();
  await page.goto("/");
  await page.getByRole("button", { name: "Play an existing story" }).click();
  await expect(page.locator(".reader-story-title")).toContainText("The Photograph — edited");
  await expect(page.locator(".prose")).toContainText("The first time you saw the girl");
  expect(errors).toEqual([]);
});

test("retains invalid drafts and reports their errors instead of opening a stale story", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await savedStatus(page);
  await appendInk(page, "\n=== broken ===\n-> target_does_not_exist\n");
  await expect(page.locator(".editor-status").getByRole("status")).toHaveText(
    "Draft saved · fix issues to update the reader",
    { timeout: 20_000 },
  );
  await page.reload();
  await expect(page.locator(".editor-status").getByRole("status")).toHaveText(
    "Saved project loaded",
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play an existing story" }).click();
  await expect(page.getByRole("alert")).toContainText("target_does_not_exist");
  await expect(page.getByRole("link", { name: "Open Story Editor", exact: true })).toBeVisible();
});

test("after an editor update that no longer reads the saved draft, keeps it and starts again on request", async ({
  page,
}) => {
  await expect(page.locator(".editor-status [role=status]")).toContainText("Saved");
  // A stored draft from a schema this editor does not know.
  const [record] = (await readKeys(page, "editor", ["house/record"])) as [object];
  await writeKey(page, "editor", "house/record", { ...record, draft: { retired: true } });
  await page.reload();
  await expect(page.getByRole("status")).toContainText("does not match this version");
  const saved = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download the saved project" }).click();
  const file = await readFile((await (await saved).path())!, "utf8");
  expect(JSON.parse(file).draft).toEqual({ retired: true });
  await page.getByRole("button", { name: "Start from the original story" }).click();
  await expect(page.getByLabel("Story title", { exact: true })).toHaveValue(
    "The House That Remembered",
  );
  await page.getByRole("tab", { name: "Review", exact: true }).click();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.getByText("Started again: the saved project could not be read")).toBeVisible();
});
