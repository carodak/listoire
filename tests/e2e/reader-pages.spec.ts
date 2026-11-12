import { expect, test } from "./test.ts";
import type { Page } from "@playwright/test";
import { animationsOn, enterReader, next, readUntil } from "./oree.ts";
import { fakeSpeech, speakBoundary } from "./speech.ts";

/** Changes the English bundle before the reader loads it. */
const editBundle = (page: Page, edit: (bundle: Record<string, any>) => void) =>
  page.route("**/stories/house/en.json", async (route) => {
    const response = await route.fetch();
    const bundle = await response.json();
    edit(bundle);
    await route.fulfill({ response, json: bundle });
  });

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

test("keeps character size, aligns language chevron, removes close border and preserves text width beside art", async ({
  page,
}) => {
  await enterReader(page);
  const character = page.getByRole("button", { name: /My Character/ });
  const before = (await character.boundingBox())!;
  const font = await character.evaluate((element) => getComputedStyle(element).fontSize);
  await character.hover();
  const after = (await character.boundingBox())!;
  expect(after.width).toBeCloseTo(before.width, 1);
  expect(after.height).toBeCloseTo(before.height, 1);
  await expect(character).toHaveCSS("font-size", font);
  const language = (await page.locator(".reader-toolbar .language-picker summary").boundingBox())!;
  const chevron = (await page.locator(".reader-toolbar .language-chevron").boundingBox())!;
  expect(chevron.y + chevron.height / 2).toBeCloseTo(language.y + language.height / 2, 0);
  await page.getByRole("button", { name: "Reading preferences", exact: true }).click();
  await expect(page.locator(".reading-sidebar header button")).toHaveCSS("border-top-width", "0px");
  await expect(
    page
      .getByRole("combobox", { name: "Narrator", exact: true })
      .locator('option[value^="narrator."]'),
  ).toHaveCount(6);
  await page.locator(".reading-sidebar header button").click();
  const plain = (await page.locator(".reader-copy").boundingBox())!.width;
  await next(page);
  await expect(page.locator(".story-art img").first()).toBeVisible();
  const illustrated = (await page.locator(".reader-copy").boundingBox())!.width;
  expect(illustrated).toBeCloseTo(plain, 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("places Examine directly under its image and retains zoom and details without reset", async ({
  page,
}, info) => {
  await enterReader(page);
  await next(page);
  const examine = page.getByRole("button", { name: "Examine Nour", exact: true });
  await expect(examine).toBeVisible();
  const illustration = page.locator('[data-examinable="true"] > .scene-illustration');
  const picture = (await illustration.boundingBox())!;
  expect((await examine.boundingBox())!.y - picture.y - picture.height).toBeCloseTo(0, 0);
  await examine.click();
  const dialog = page.getByRole("dialog", { name: "Nour", exact: true });
  await expect(dialog.getByRole("button", { name: /Reset view/ })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Turn over", exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(dialog.locator(".magnified-image")).toHaveCSS(
    "transform",
    "matrix(1.5, 0, 0, 1.5, 0, 0)",
  );
  await expect(
    dialog.getByRole("button", { name: "Examine details", exact: true }).locator("svg"),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath("examination.png") });
  await page.keyboard.press("Escape");
  await expect(examine).toBeFocused();
});

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

test("renders the numbered grey d20 model for a contextual attribute check", async ({
  page,
}, info) => {
  await enterReader(page);
  const choice = await readUntil(
    page,
    page.locator(".choices button").filter({ hasText: /\/20/ }),
    30,
  );
  await choice.click();
  const check = page.locator(".check-roll-modal");
  await expect(check.locator(".check-test")).toContainText("/20");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(check.getByRole("button", { name: "Roll dice", exact: true })).toHaveCount(0);
  await expect(check.locator('.dice-result[data-sides="20"] canvas')).toBeVisible();
  await expect(check.getByRole("button", { name: "Continue", exact: true })).toBeEnabled();
  await page.screenshot({ path: info.outputPath("grey-d20.png") });
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

test("board effects light the whole viewport, menu included", async ({ page }) => {
  await editBundle(page, (bundle) => {
    bundle.scenes.atelier.events = [
      {
        id: "viewport-test",
        blockId: "page",
        trigger: { kind: "passage" },
        action: {
          kind: "effect",
          effect: { id: "light-flicker", duration: 10000, target: "canvas", intensity: 0.2 },
        },
      },
    ];
  });
  await enterReader(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Replay page", exact: true }).click();
  const effect = page.locator(".reader-viewport-effect");
  await expect(effect).toBeAttached();
  const bounds = (await effect.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(bounds.x).toBeCloseTo(0, 0);
  expect(bounds.width).toBeCloseTo(viewport.width, 0);
  expect(bounds.y).toBeCloseTo(0, 0);
  expect(bounds.height).toBeCloseTo(viewport.height, 0);
  // Painted above the sticky menu, and never in the way of its buttons.
  await expect(effect).toHaveCSS("pointer-events", "none");
  await page.getByRole("button", { name: "Reading preferences", exact: true }).click();
  await expect(page.locator(".reading-sidebar")).toBeVisible();
});

test("shows a cropped illustration once at its final size and removes the lower fade before Examine", async ({
  page,
}) => {
  await editBundle(page, (bundle) => {
    const block = bundle.scenes.messagere.blocks.find(
      (block: { kind: string }) => block.kind === "media",
    );
    block.illustration = {
      base: { role: "midground", x: 0, y: 0, scale: 1 },
      layers: [],
      aspect: "portrait",
      blend: "paper",
      wrap: "none",
      autoCrop: true,
    };
  });
  await enterReader(page);
  await next(page);
  const stage = page.locator('[data-examinable="true"] .scene-illustration');
  await expect(stage).toHaveCSS("mask-image", "none");
  const drawing = stage.locator(".shot-plane-image");
  await expect(drawing).toHaveAttribute("src", /^blob:/);
  await expect
    .poll(() => drawing.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  const source = await drawing.getAttribute("src");
  const first = (await drawing.boundingBox())!;
  await page.waitForTimeout(500);
  expect(await drawing.getAttribute("src")).toBe(source);
  const final = (await drawing.boundingBox())!;
  for (const key of ["x", "y", "width", "height"] as const)
    expect(final[key]).toBeCloseTo(first[key], 1);
  const button = (await page.getByRole("button", { name: "Examine Nour" }).boundingBox())!;
  const image = (await stage.boundingBox())!;
  expect(button.y - image.y - image.height).toBeCloseTo(0, 0);
});

/** The voice reaches "On"; the visible text's length, sampled on every frame for 400 ms. */
const revealAfterFirstWord = (page: Page) =>
  page.evaluate(async () => {
    type Spoken = { onboundary?: (event: unknown) => void }[];
    (window as unknown as { spoken: Spoken }).spoken
      .at(-1)!
      .onboundary?.({ charIndex: 0, charLength: 2 });
    const lengths: number[] = [];
    const until = performance.now() + 400;
    const text = () => document.querySelector('.prose p > span[aria-hidden="true"]');
    await new Promise<void>((resolve) => {
      const sample = () => {
        lengths.push(text()?.textContent?.length ?? 0);
        if (performance.now() < until) requestAnimationFrame(sample);
        else resolve();
      };
      requestAnimationFrame(sample);
    });
    return lengths;
  });

test("types graphemes smoothly while staying just one word ahead of narrated boundaries", async ({
  page,
}) => {
  await fakeSpeech(page);
  await enterReader(page, { skipIntro: false });
  await page.getByRole("button", { name: "Reading preferences", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Text display", exact: true })
    .selectOption("progressive");
  await page.getByRole("combobox", { name: "Narrator", exact: true }).selectOption("device:test");
  await page.getByRole("checkbox", { name: "Read aloud", exact: true }).check();
  await page.locator(".reading-sidebar header button").click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Replay page", exact: true }).click();
  const visible = page.locator('.prose p > span[aria-hidden="true"]').first();
  await expect(visible).toHaveText("On");
  const samples = await revealAfterFirstWord(page);
  expect(samples.some((length) => length > 3 && length < 13)).toBe(true);
  expect(samples.every((length, index) => !index || length - samples[index - 1]! <= 5)).toBe(true);
  await expect(visible).toHaveText("On Wednesdays,");
  await speakBoundary(page, 3, 11);
  await expect(visible).toHaveText("On Wednesdays, you");
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
