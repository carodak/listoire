import { expect, test } from "./test.ts";
import type { Page } from "@playwright/test";

async function enter(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /Play an existing story|Jouer/ }).click();
  await expect(
    page.getByRole("heading", { name: /Girl in the Photograph|jeune fille/ }),
  ).toBeVisible();
}

test("photograph supports keyboard, shared zoom/pan, turning, clue discovery and reload", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enter(page);
  await page.getByRole("button", { name: "Examine the photograph", exact: true }).click();
  const viewer = page.getByRole("dialog", { name: "The photograph" });
  await expect(viewer).toBeVisible();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  const surface = viewer.locator(".magnified-image");
  await surface.focus();
  await page.keyboard.press("ArrowRight");
  await expect(viewer.locator(".magnifier-lens")).toHaveAttribute("data-x", "0.530");
  await page.getByRole("button", { name: "Turn over", exact: true }).click();
  await expect(viewer.locator(".photo-reverse")).toContainText("do not tell her your name");
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await page.getByRole("button", { name: "Examine details", exact: true }).click();
  await expect(viewer).toContainText("looks exactly like you");
  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Examine the photograph", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Examine the photograph", exact: true }).click();
  await page.getByRole("button", { name: "Inspect the photograph detail", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".prose")).toContainText("upstairs window in the photograph is open");
  await page.reload();
  await page.getByRole("button", { name: "Play an existing story" }).click();
  await page.getByRole("button", { name: /My Character/ }).click();
  await page.getByRole("button", { name: /Inventory/ }).click();
  await expect(page.getByRole("dialog", { name: "Inventory", exact: true })).toContainText(
    "Photograph clue",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Examine the photograph", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Inspect the photograph detail", exact: true }),
  ).toHaveCount(0);
});

test("English and French finish the original branches and retain inventory and relationships", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enter(page);
  for (const label of [
    "Continue reading",
    "Ask about the locked room",
    "Continue reading",
    "Break the wax seal",
    "Continue reading",
    "Turn the photograph over",
    "Continue reading",
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    if (label === "Break the wax seal") {
      const illustration = page
        .getByRole("complementary", { name: "Page illustration" })
        .locator('img[src$="paper.modern-male-character-sitting.webp"]');
      await expect(illustration).toHaveCSS("filter", "none");
      await expect(illustration).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    }
  }
  await expect(page.getByRole("heading", { name: "The House Is Waiting" })).toBeVisible();
  await page.getByRole("button", { name: /My Character/ }).click();
  await page.getByRole("button", { name: /Inventory/ }).click();
  await expect(page.getByRole("dialog", { name: "Inventory", exact: true })).toContainText(
    "Brass key",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Language: English", exact: true }).click();
  await page.getByRole("button", { name: "Français", exact: true }).click();
  for (const label of [
    "Continuer la lecture",
    "Poser une question sur le chant",
    "Continuer la lecture",
    "Tenir l’enveloppe devant la lampe",
    "Continuer la lecture",
    "Regarder par la fenêtre",
    "Continuer la lecture",
  ])
    await page.getByRole("button", { name: label, exact: true }).click();
  await expect(page.getByRole("heading", { name: "La maison vous attend" })).toBeVisible();
  await page.getByRole("button", { name: /Mon personnage/ }).click();
  await page.getByRole("button", { name: /Inventaire/ }).click();
  await expect(page.getByRole("dialog", { name: "Inventaire", exact: true })).toContainText(
    "Message caché",
  );
  await expect(page.getByRole("dialog", { name: "Inventaire", exact: true })).not.toContainText(
    "Clé en laiton",
  );
});

test("progressive text can be revealed immediately and preferences persist", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await enter(page);
  const next = page.getByRole("button", { name: "Continue reading", exact: true });
  await expect(next).toHaveCount(0);
  await page.getByRole("button", { name: "Show all text", exact: true }).click();
  await expect(next).toBeEnabled();
  await page.getByText("Reading preferences", { exact: true }).click();
  await page.getByRole("button", { name: "Page color #faf8f2", exact: true }).click();
  await expect(page.locator(".reader")).toHaveCSS("background-color", "rgb(250, 248, 242)");
  await page.getByLabel("Text size", { exact: true }).selectOption("large");
  await page.getByLabel("Typeface", { exact: true }).selectOption("sans");
  await page.getByLabel("Line spacing", { exact: true }).selectOption("spacious");
  await page.getByLabel("Text display", { exact: true }).selectOption("instant");
  await expect(page.locator(".prose")).toHaveCSS("font-size", "22px");
  await page.getByText("Reading preferences", { exact: true }).click();
  await next.click();
  await expect(page.getByRole("button", { name: "Ask about the singing" })).toBeEnabled();
  await page.reload();
  await page.getByRole("button", { name: "Play an existing story" }).click();
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
  await page.getByText("Reading preferences", { exact: true }).click();
  await page.getByLabel("Story sound effects", { exact: true }).check();
  await page.getByText("Reading preferences", { exact: true }).click();
  await page.getByRole("button", { name: "Continue reading", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Ask about the locked room", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Ask about the locked room", exact: true }).click();
  await expect(page.locator(".prose")).toContainText("twenty-nine years");
  await page.getByRole("button", { name: "Listoire home" }).click();
  expect(errors).toEqual([]);
  const events = await page.evaluate(
    () => (window as unknown as { storyAudioEvents: string[] }).storyAudioEvents,
  );
  expect(events.some((event) => event.endsWith("sonniss.telephone.mp3"))).toBe(true);
  expect(events).toContain("pause");
});

test("initial reader requests only its scene resources and no source catalogs", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const requested: string[] = [];
  page.on("request", (request) => requested.push(new URL(request.url()).pathname));
  await enter(page);
  await expect(page.locator(".scene-illustration img").first()).toBeVisible();
  expect(
    requested.some((path) =>
      /assets\/catalog|heritage-library|GameAudioBundle|\.wav$|\.zip$/.test(path),
    ),
  ).toBe(false);
  expect(
    [...new Set(requested.filter((path) => path.includes("/stories/house/media/")))].sort(),
  ).toEqual(["/stories/house/media/house.night.webp"]);
});
