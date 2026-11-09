import { expect, test } from "./test.ts";
import type { Page } from "@playwright/test";
import {
  chooseFirst,
  dismissNotice,
  firstChoice,
  onPage,
  playStory,
  readTo,
  withExaminationReverse,
} from "./oree.ts";

async function enter(page: Page) {
  await page.route("**/api/narration**", (route) => route.fulfill({ status: 503, body: "{}" }));
  await page.goto("/");
  await playStory(page);
  await onPage(page, "matin-ville");
}

async function openInventory(page: Page, french = false) {
  await page.getByRole("button", { name: french ? /Mon personnage/ : /My Character/ }).click();
  await page.getByRole("button", { name: french ? /Inventaire/ : /Inventory/ }).click();
  return page.getByRole("dialog", { name: french ? "Inventaire" : "Inventory", exact: true });
}

test("examination supports keyboard, shared zoom/pan, turning, details and reload", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await withExaminationReverse(page, "Do not tell her your name.");
  await enter(page);
  await readTo(page, "messagere");
  const examine = page.getByRole("button", { name: "Examine Nour", exact: true });
  await examine.click();
  const viewer = page.getByRole("dialog", { name: "Nour" });
  await expect(viewer).toBeVisible();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  const surface = viewer.locator(".magnified-image");
  await surface.focus();
  await page.keyboard.press("ArrowRight");
  await expect(viewer.locator(".magnifier-lens")).toHaveAttribute("data-x", "0.530");
  await page.getByRole("button", { name: "Turn over", exact: true }).click();
  await expect(viewer.locator(".photo-reverse")).toContainText("do not tell her your name", {
    ignoreCase: true,
  });
  // Turning resets the view (the separate "Reset view" control was removed).
  await page.getByRole("button", { name: "Turn over", exact: true }).click();
  await expect(viewer.locator(".magnifier-lens")).toHaveCount(0);
  await page.getByRole("button", { name: "Examine details", exact: true }).click();
  await expect(viewer.locator(".photo-caption")).toContainText("travelling coat");
  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
  await expect(examine).toBeFocused();
  await page.reload();
  await playStory(page);
  await onPage(page, "messagere");
  await examine.click();
  await expect(viewer.locator(".photo-caption")).toContainText("admissions letter");
});

test("English and French keep separate progress, inventory and artwork treatment", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enter(page);
  await readTo(page, "messagere");
  const illustration = page.locator('[data-block="messagere.illustration"] img').first();
  await expect(illustration).toHaveCSS("filter", "none");
  await expect(illustration).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await chooseFirst(page); // accept the letter (item notice)
  await readTo(page, "lettre");
  await expect(await openInventory(page)).toContainText("The letter from Orée");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Language: English", exact: true }).click();
  await page.getByRole("button", { name: "Français", exact: true }).click();
  await onPage(page, "matin-ville"); // the French save starts on its own
  await expect(await openInventory(page, true)).not.toContainText("La lettre d'Orée");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await readTo(page, "lettre");
  await expect(await openInventory(page, true)).toContainText("La lettre d'Orée");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Langue: Français", exact: true }).click();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await onPage(page, "lettre");
});

test("progressive text can be revealed immediately and preferences persist", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await enter(page);
  const preferences = page.getByRole("button", { name: "Reading preferences", exact: true });
  await preferences.click();
  await page.getByLabel("Text display", { exact: true }).selectOption("progressive");
  await preferences.click();
  await page.getByRole("button", { name: "Replay page", exact: true }).click();
  await expect(firstChoice(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Show all text", exact: true }).click();
  await expect(firstChoice(page)).toBeEnabled();
  await preferences.click();
  await page.getByRole("button", { name: "Page color #faf8f2", exact: true }).click();
  await expect(page.locator(".reader")).toHaveCSS("background-color", "rgb(250, 248, 242)");
  await page.getByLabel("Text size", { exact: true }).selectOption("large");
  await page.getByLabel("Typeface", { exact: true }).selectOption("sans");
  await page.getByLabel("Line spacing", { exact: true }).selectOption("spacious");
  await page.getByLabel("Text display", { exact: true }).selectOption("instant");
  await expect(page.locator(".prose")).toHaveCSS("font-size", "25px");
  await preferences.click();
  await chooseFirst(page);
  await onPage(page, "etabli");
  await expect(firstChoice(page)).toBeEnabled();
  await page.reload();
  await playStory(page);
  await expect(page.locator(".reader")).toHaveClass(/font-sans text-large lines-spacious/);
  await expect(page.locator(".reader")).toHaveCSS("background-color", "rgb(250, 248, 242)");
  await expect(page.getByRole("button", { name: "Show all text" })).toHaveCount(0);
});

test("failed story audio never blocks progression and departing cancels presentation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const events: string[] = [];
    Object.assign(window, { storyAudioEvents: events });
    Object.defineProperty(window, "Audio", {
      value: class extends EventTarget {
        volume = 1;
        constructor(source: string) {
          super();
          events.push(source);
        }
        play() {
          events.push("play");
          return Promise.reject(new DOMException("Blocked", "NotAllowedError"));
        }
        pause() {
          events.push("pause");
        }
      },
    });
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await enter(page);
  const preferences = page.getByRole("button", { name: "Reading preferences", exact: true });
  await preferences.click();
  await page.getByLabel("Story sound effects", { exact: true }).check();
  await preferences.click();
  await readTo(page, "atelier"); // this page starts a sound effect and music
  await expect(firstChoice(page)).toBeEnabled();
  await chooseFirst(page);
  await onPage(page, "messagere");
  await page.getByRole("button", { name: "Listoire home" }).click();
  expect(errors).toEqual([]);
  const events = await page.evaluate(
    () => (window as unknown as { storyAudioEvents: string[] }).storyAudioEvents,
  );
  expect(events.some((event) => event.endsWith("audio.5ed3276af9fe4c73edaa.mp3"))).toBe(true);
  expect(events).toContain("pause");
});

test("initial reader requests only its scene resources and no source catalogs", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const requested: string[] = [];
  page.on("request", (request) => requested.push(new URL(request.url()).pathname));
  await enter(page);
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
