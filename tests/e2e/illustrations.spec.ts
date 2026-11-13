import { expect, test } from "./test.ts";
import type { Page } from "@playwright/test";
import { houseBundles } from "../fixtures/house-project.ts";
import {
  animationsOn,
  chooseFirst,
  editBundle,
  enterReader,
  next,
  onPage,
  openOree,
  readTo,
} from "./oree.ts";

async function turnPagesAnimated(page: Page) {
  await page.getByRole("button", { name: "Reading preferences", exact: true }).click();
  await page.getByRole("checkbox", { name: "Animated page turns", exact: true }).check();
  await page.locator(".reading-sidebar header button").click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
}

/** Pauses or plays the words leaving the page. */
const departures = (page: Page, action: "pause" | "play") =>
  page.evaluate((action) => {
    for (const animation of document.getAnimations())
      if (
        animation.effect instanceof KeyframeEffect &&
        animation.effect.target instanceof Element &&
        animation.effect.target.closest(".page-word-departure")
      )
        animation[action]();
  }, action);

test("spends three pages in the ordinary world with relevant layered art before the letter", async ({
  page,
}) => {
  await enterReader(page, { skipIntro: false });
  await expect(page.locator(".reader-copy h1")).toHaveText("The morning errands");
  await expect(page.locator(".multiplane-plane")).toHaveCount(2);
  await expect(page.locator(".narrative-media")).toHaveAttribute("data-wrap", "none");
  await next(page);
  await expect(page.locator(".reader-copy h1")).toHaveText("A notch in the balance staff");
  await expect(page.locator(".narrative-media")).toHaveCount(0);
  await next(page);
  await expect(page.locator(".reader-copy h1")).toHaveText("Twelve strokes at noon");
  await expect(page.locator(".multiplane-plane")).toHaveCount(2);
  await next(page);
  await expect(page.locator(".reader-copy h1")).toHaveText("The watch without a spring");
});

test("right-page artwork changes with the story and returns on Back and Replay", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openOree(page);
  await readTo(page, "messagere");
  const artwork = page.locator('.story-art [data-block="messagere.illustration"]');
  await expect(artwork).toBeVisible();
  await chooseFirst(page);
  await onPage(page, "preuve");
  await expect(artwork).toHaveCount(0);
  await page.getByRole("button", { name: "Previous page", exact: true }).click();
  await onPage(page, "messagere");
  await expect(artwork).toBeVisible();
  await page.getByRole("button", { name: "Replay page", exact: true }).click();
  await expect(artwork).toBeVisible();
  await expect(artwork).toHaveCount(1);
});

test("dissolves words upward while keeping the page color fixed", async ({ page }) => {
  await enterReader(page);
  await turnPagesAnimated(page);
  const color = await page
    .locator(".reader")
    .evaluate((node) => getComputedStyle(node).backgroundColor);
  await page.locator(".choices button").first().click();
  await expect(page.locator(".page-word-departure span").first()).toBeVisible();
  await departures(page, "pause");
  await expect(page.locator(".reader-copy h1")).toHaveText("The watch without a spring");
  await page.waitForTimeout(180);
  await expect(page.locator(".reader-copy h1")).toHaveText("The watch without a spring");
  await departures(page, "play");
  await expect(page.locator(".reader")).toHaveCSS("background-color", color);
  await expect(page.locator(".reader")).toHaveCSS("opacity", "1");
  await expect(page.locator(".reader-copy h1")).toHaveText("The ninth delivery");
  await expect(page.locator(".page-word-departure")).toHaveCount(0);
  await page.getByRole("button", { name: "Previous page", exact: true }).click();
  await expect(page.locator(".reader-copy h1")).toHaveText("The watch without a spring");
  await expect(page.locator(".page-word-departure")).toHaveCount(0);
  await expect(page.locator(".reader")).toHaveCSS("background-color", color);
});

test("after an item, fades the illustration and dissolves the heading before the next page fades in", async ({
  page,
}) => {
  await enterReader(page);
  await next(page);
  await turnPagesAnimated(page);
  await page.locator(".choices button").first().click();
  await expect(page.locator('[data-departure-heading="true"]').first()).toBeAttached();
  // Held mid-departure: the old page, heading included, is still the one shown.
  await departures(page, "pause");
  const timing = await page.evaluate(() =>
    document
      .getAnimations()
      .filter(
        (animation) =>
          animation.effect instanceof KeyframeEffect &&
          animation.effect.target instanceof Element &&
          animation.effect.target.matches(".narrative-media"),
      )
      .map((animation) => animation.effect!.getTiming().duration),
  );
  expect(timing).toContain(920);
  await expect(page.locator(".reader-copy h1")).toHaveText("The ninth delivery");
  await departures(page, "play");
  await expect(page.locator(".reader-copy h1")).toHaveText("A coin suspended in the air");
  await expect(page.locator(".page-word-departure")).toHaveCount(0);
  const arrival = await page
    .locator(".reader-scene")
    .evaluate((element) => getComputedStyle(element).animationDuration);
  expect(arrival).toBe("1.4s");
});

test("plays instant-text illustrations from the beginning and keeps them running when all text is revealed", async ({
  page,
}) => {
  await enterReader(page, { skipIntro: false });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Replay page", exact: true }).click();
  await expect.poll(() => animationsOn(page, ".multiplane-plane")).toBeGreaterThan(0);
  // Tags these animations, to check that the very same ones keep running afterwards.
  const times = await page.evaluate(() =>
    document
      .getAnimations()
      .filter(
        (animation) =>
          animation.effect instanceof KeyframeEffect &&
          animation.effect.target instanceof Element &&
          animation.effect.target.classList.contains("multiplane-plane"),
      )
      .map((animation, index) => {
        animation.id = `live-illustration-${index}`;
        return {
          time: Number(animation.currentTime),
          duration: Number(animation.effect!.getTiming().duration),
        };
      }),
  );
  expect(times.every((timing) => timing.time < timing.duration - 2000)).toBe(true);
  await page.locator(".prose p").first().click();
  const tagged = () =>
    page.evaluate(
      () =>
        document
          .getAnimations()
          .filter(
            (animation) =>
              animation.id.startsWith("live-illustration-") && animation.playState === "running",
          ).length,
    );
  await expect.poll(tagged).toBe(times.length);
});

test("starts an instant-text illustration below the fold only when it scrolls into view", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 340 });
  await enterReader(page, { skipIntro: false });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Replay page", exact: true }).click();
  await page.waitForTimeout(1500);
  expect(await animationsOn(page, ".multiplane-plane")).toBe(0);
  await page.locator(".narrative-media").first().scrollIntoViewIfNeeded();
  await expect.poll(() => animationsOn(page, ".multiplane-plane")).toBeGreaterThan(0);
});

test("plays an ordered fullscreen illustration even when the text display is instant", async ({
  page,
}) => {
  await editBundle(page, (bundle) => {
    const scene = bundle.scenes["matin-ville"];
    const picture = scene.blocks.find((block: { kind: string }) => block.kind === "media");
    picture.layout = "fullscreen";
    for (const event of scene.events)
      if (event.blockId === picture.id) {
        event.blocking = true;
        event.action.effect.duration = 2500;
      }
    scene.events.push({
      id: "after-cinematic",
      blockId: "page",
      trigger: { kind: "segment", segmentId: "matin-ville.p2" },
      blocking: false,
      action: {
        kind: "effect",
        effect: { id: "screen-shake", duration: 2000, intensity: 0.1, target: "canvas" },
      },
    });
  });
  await enterReader(page, { skipIntro: false });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Replay page", exact: true }).click();
  await expect(page.locator(".cinematic-dialog[open]")).toBeVisible();
  await expect(page.locator(".choices button")).toHaveCount(0);
  expect(
    await page.locator(".reader-board").evaluate((element) => element.getAnimations().length),
  ).toBe(0);
  await expect(page.locator(".cinematic-dialog")).toHaveCount(0, { timeout: 10000 });
  await expect(page.locator(".choices button")).toBeVisible();
});

test("a declarative cinematic can be skipped without changing its story result", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/stories/house/en.json", async (route) => {
    const bundle = structuredClone(houseBundles.en!);
    const room = bundle.scenes!.room!;
    const block = room.blocks!.find(
      (block) => block.kind === "media" && block.layout === "fullscreen",
    );
    const event = room.events!.find((event) => event.blocking && event.action.kind === "effect");
    if (block?.kind !== "media" || event?.action.kind !== "effect")
      throw new Error("Missing cinematic fixture");
    block.durationMs = 100;
    event.action.effect.duration = 5000;
    await route.fulfill({ json: bundle });
  });
  await openOree(page);
  await page.locator(".prose p").first().click();
  await page.getByRole("button", { name: "Continue reading", exact: true }).click();
  await page.locator(".prose p").first().click();
  await page.getByRole("button", { name: "Ask about the locked room", exact: true }).click();
  const cinematic = page.locator(".cinematic-dialog");
  const stage = await cinematic.locator(".cinematic-stage").elementHandle();
  await cinematic.getByRole("button", { name: "Pause", exact: true }).click();
  const viewport = page.viewportSize()!;
  const toolbar = (await page.locator(".reader-toolbar").boundingBox())!;
  const dialogBounds = (await cinematic.boundingBox())!;
  expect(dialogBounds.x).toBe(0);
  expect(dialogBounds.y).toBeCloseTo(toolbar.y + toolbar.height, 0);
  expect(dialogBounds.width).toBeCloseTo(viewport.width, 0);
  expect(dialogBounds.height).toBeCloseTo(viewport.height - dialogBounds.y, 0);
  const image = cinematic.locator(".shot-image").first();
  const imageBounds = (await image.boundingBox())!;
  expect(imageBounds.width).toBeGreaterThanOrEqual(viewport.width - 1);
  expect(imageBounds.height).toBeGreaterThanOrEqual(dialogBounds.height - 1);
  await expect(image).toHaveCSS("object-fit", "cover");
  await cinematic.getByRole("button", { name: "Resume", exact: true }).click();
  await cinematic.getByRole("button", { name: "Skip cinematic", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Skip cinematic", exact: true })).toHaveCount(0);
  await page.locator(".prose p").first().click();
  await expect(page.locator(".prose")).toContainText("twenty-nine years");
  await expect(page.getByRole("button", { name: "Continue reading", exact: true })).toBeEnabled();
  const running = await stage!.evaluate((stage) => stage.getAnimations({ subtree: true }).length);
  await stage!.dispose();
  expect(running).toBe(0);
  await expect(page.locator(".prose .media-fullscreen")).toHaveCount(0);
  await page.getByRole("button", { name: "Replay page", exact: true }).click();
  await expect(page.locator(".cinematic-dialog")).toBeVisible();
  await expect(page.locator(".cinematic-dialog")).toHaveCount(0, { timeout: 8000 });
  await expect(page.locator(".prose .media-fullscreen")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Continue reading", exact: true })).toBeEnabled();
});
