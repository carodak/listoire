import { expect, test } from "./test.ts";
import { readEditorKeys, writeEditorKey } from "./editor-db.ts";
import { enterReader, playStory, settlePage } from "./oree.ts";
import { startBeforeFirstFight } from "./oree-saves.ts";

test("updates an old active Orée draft while keeping its full previous version in history", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/narration**", (route) => route.fulfill({ status: 503, body: "{}" }));
  await page.goto("/");
  const project = await (await page.request.get("/stories/house/project.json")).json();
  project.release = "oree-1.2.0";
  for (const language of Object.values(project.languages) as {
    script: string;
    configuration: { checkpointId: string };
  }[]) {
    language.configuration.checkpointId = "oree-v1-2";
    language.script += "\n// Former author's note\n";
  }
  // The editor's record as it was stored before its versions had their own keys.
  await writeEditorKey(page, "house", {
    revision: 1,
    draft: project,
    published: null,
    history: [],
  });
  await playStory(page);
  await expect(page.locator(".reader-copy h1")).toHaveText("The morning errands");
  const [record] = (await readEditorKeys(page, ["house/record"])) as [
    { draft: { release: string }; history: { id: number }[] },
  ];
  const [archived] = (await readEditorKeys(page, [
    `house/version/${record.history.at(-2)!.id}`,
  ])) as [{ languages: { en: { script: string } } }];
  expect(record.draft.release).toBe("oree-1.3.0");
  expect(archived.languages.en.script).toContain("Former author's note");
});

test("keeps a check on its page until its dice settle and the reader confirms", async ({
  page,
}, info) => {
  await enterReader(page);
  const check = page.locator(".check-roll-modal");
  for (let step = 0; step < 20 && !(await check.count()); step++) {
    await settlePage(page);
    await page.locator(".choices button").first().click();
    await expect(page.locator(".reader")).toHaveAttribute("aria-busy", "false");
  }
  await expect(check).toBeVisible();
  const heading = await page.locator(".reader-copy h1").textContent();
  await expect(check.locator(".dice-result")).toHaveCount(1);
  await expect(check.locator(".spell-cast-effect")).toHaveCount(1);
  await expect(check.getByRole("button", { name: "Roll dice", exact: true })).toHaveCount(0);
  const advance = check.getByRole("button", { name: "Continue", exact: true });
  await page.screenshot({ path: info.outputPath("dice-in-flight.png") });
  await expect(advance).toBeEnabled();
  await expect(page.locator(".reader-copy h1")).toHaveText(heading!);
  await expect(check.locator(".dice-result").first()).toHaveAttribute("aria-label", /^d6: [1-6]$/);
  const savedRoll = await check.locator(".dice-result").first().getAttribute("aria-label");
  await page.screenshot({ path: info.outputPath("dice-result.png") });
  await page.reload();
  await playStory(page);
  await expect(check).toBeVisible();
  await expect(check.locator(".spell-cast-effect")).toHaveCount(0);
  await expect(check.getByRole("button", { name: "Roll dice", exact: true })).toHaveCount(0);
  await expect(check.locator(".dice-result").first()).toHaveAttribute("aria-label", savedRoll!);
  await advance.click();
  await expect(check).toHaveCount(0);
  await expect(page.locator(".reader-copy h1")).not.toHaveText(heading!);
  await page.getByRole("button", { name: "Previous page", exact: true }).click();
  await expect(page.locator(".reader-copy h1")).toHaveText(heading!);
  await expect(check).toHaveCount(0);
  await expect(page.locator(".choices button").first()).toBeEnabled();
});

test("waits for Fight even after restoring an encounter and animates the combat viewport", async ({
  page,
}) => {
  await startBeforeFirstFight(page);
  await enterReader(page, { skipIntro: false });
  const combat = page.locator(".reader-combat-modal");
  await page
    .locator(".choices button")
    .filter({ hasText: /^Fight/ })
    .first()
    .click();
  await expect(combat).toBeVisible();
  await page.reload();
  await playStory(page);
  await expect(page.locator(".reader-copy h1")).toBeVisible();
  await expect(combat).toHaveCount(0);
  await page.getByRole("button", { name: "Fight", exact: true }).click();
  await expect(combat).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await combat.getByRole("button", { name: "Basic attack", exact: true }).click();
  const feedback = combat.locator(".reader-viewport-feedback");
  await expect(feedback).toBeAttached();
  await expect(combat).toHaveCSS("transform", "none");
  const bounds = (await feedback.boundingBox())!;
  expect(bounds.width).toBeCloseTo(page.viewportSize()!.width, 0);
  expect(bounds.x).toBeCloseTo(0, 0);
  expect(bounds.y).toBeCloseTo(0, 0); // the whole view, menu included
  await expect(combat.getByRole("button", { name: "Basic attack", exact: true })).toBeEnabled();
  await combat.getByRole("button", { name: "Use an ability", exact: true }).click();
  await combat.locator(".combat-ability-menu button").first().click();
  await expect(page.locator(".dice-roll")).toBeVisible();
  await expect(page.getByRole("button", { name: "Roll dice", exact: true })).toHaveCount(0);
});
