import { expect, test } from "./test.ts";
import { readKeys, writeKey } from "./idb.ts";
import {
  chooseFirst,
  dismissNotice,
  firstChoice,
  onPage,
  openOree,
  playStory,
  saveKey,
} from "./oree.ts";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("chooses, reloads the resolved passage, downloads and explicitly restarts", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await playStory(page);
  await onPage(page, "matin-ville");
  await expect(firstChoice(page)).toBeVisible();
  if (["chromium", "mobile"].includes(testInfo.project.name)) {
    await page.screenshot({ path: testInfo.outputPath("opening.png"), fullPage: true });
  }
  await firstChoice(page).click();
  await onPage(page, "etabli");
  await page.reload();
  await playStory(page);
  await onPage(page, "etabli");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download saved progress" }).click();
  expect((await download).suggestedFilename()).toBe("listoire-house-en.json");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Read from the beginning" }).click();
  await onPage(page, "etabli");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Read from the beginning" }).click();
  await onPage(page, "matin-ville");
  await expect(firstChoice(page)).toBeVisible();
  expect(errors).toEqual([]);
});

test("resetting a paused story resumes a clean first page and allows reading again", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await playStory(page);
  await firstChoice(page).click();
  await onPage(page, "etabli");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Read from the beginning", exact: true }).click();
  await onPage(page, "matin-ville");
  await expect(page.locator('[data-segment="matin-ville.p1"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toHaveCount(0);
  await firstChoice(page).click();
  await onPage(page, "etabli");
  expect(errors).toEqual([]);
});

test("Back still works after a reload, through the saved previous pages", async ({ page }) => {
  await openOree(page);
  await onPage(page, "matin-ville");
  await chooseFirst(page);
  await onPage(page, "etabli");
  await chooseFirst(page);
  const third = await page.locator(".reader-copy").getAttribute("data-passage");
  expect(third).not.toBe("etabli");
  await page.reload();
  await playStory(page);
  await onPage(page, third!);
  const back = page.getByRole("button", { name: "Previous page", exact: true });
  await expect(back).toBeEnabled();
  await back.click();
  await onPage(page, "etabli");
  await back.click();
  await onPage(page, "matin-ville");
  await expect(back).toBeDisabled();
});

test("recovers from unavailable browser storage without losing the first passage", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = IDBFactory.prototype.open;
    Object.assign(window, {
      restoreDatabase: () => {
        IDBFactory.prototype.open = original;
      },
    });
    IDBFactory.prototype.open = () => {
      throw new DOMException("Unavailable", "SecurityError");
    };
  });
  await openOree(page);
  await expect(page.getByRole("alert")).toContainText("could not be saved");
  await page.evaluate(() =>
    (window as unknown as { restoreDatabase: () => void }).restoreDatabase(),
  );
  await page.getByRole("button", { name: "Reload your saved place" }).click();
  await expect(firstChoice(page)).toBeVisible();
  await firstChoice(page).click();
  await onPage(page, "etabli");
});

test("recovers from unavailable story data and supports keyboard and narrow layouts", async ({
  page,
}) => {
  await page.route("**/stories/house/en.json", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await openOree(page);
  await expect(page.getByRole("alert")).toContainText("could not be opened");
  await page.unroute("**/stories/house/en.json");
  await page.getByRole("button", { name: "Reload your saved place" }).click();
  const choice = firstChoice(page);
  await expect(choice).toBeVisible();
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await choice.focus();
  await page.keyboard.press("Enter");
  await onPage(page, "etabli");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
});

test("preserves an incompatible save and offers a recovery download", async ({ page }) => {
  await openOree(page);
  await expect(firstChoice(page)).toBeVisible();
  const key = await saveKey(page);
  const [save] = (await readKeys(page, "reader", [key])) as [object];
  await writeKey(page, "reader", key, { ...save, release: "old-release" });
  await page.reload();
  await playStory(page);
  await expect(page.getByRole("alert")).toContainText("another story version");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download saved progress" }).click();
  await download;
  await page.reload();
  await playStory(page);
  await expect(page.getByRole("alert")).toContainText("another story version");
});

test("initial reader requests only its scene resources and no source catalogs", async ({
  page,
}) => {
  const requested: string[] = [];
  page.on("request", (request) => requested.push(new URL(request.url()).pathname));
  await openOree(page);
  await onPage(page, "matin-ville");
  await expect(page.locator('[data-block="matin-ville.illustration"]')).toBeVisible();
  await dismissNotice(page);
  expect(
    requested.some((path) =>
      /assets\/catalog|heritage-library|GameAudioBundle|\.wav$|\.zip$/.test(path),
    ),
  ).toBe(false);
  // Only media that the first page itself references (its illustration and layers).
  const bundle = await (await page.request.get("/stories/house/en.json")).json();
  const scene = JSON.stringify(bundle.scenes["matin-ville"]);
  const own = new Set<string>(
    bundle.assets
      .filter((asset: { id: string }) => scene.includes(`"${asset.id}"`))
      .map((asset: { path: string }) => `/stories/house/${asset.path}`),
  );
  const media = [...new Set(requested.filter((path) => path.includes("/stories/house/media/")))];
  expect(media.length).toBeGreaterThan(0);
  expect(media.filter((path) => !own.has(path))).toEqual([]);
});

test("updates an old active Orée draft while keeping its full previous version in history", async ({
  page,
}) => {
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
  await writeKey(page, "editor", "house", {
    revision: 1,
    draft: project,
    published: null,
    history: [],
  });
  await playStory(page);
  await expect(page.locator(".reader-copy h1")).toHaveText("The morning errands");
  const [record] = (await readKeys(page, "editor", ["house/record"])) as [
    { draft: { release: string }; history: { id: number }[] },
  ];
  const [archived] = (await readKeys(page, "editor", [
    `house/version/${record.history.at(-2)!.id}`,
  ])) as [{ languages: { en: { script: string } } }];
  expect(record.draft.release).toBe("oree-1.3.0");
  expect(archived.languages.en.script).toContain("Former author's note");
});
