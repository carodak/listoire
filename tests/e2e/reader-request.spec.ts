import { expect, test } from "./test.ts";
import type { Page } from "@playwright/test";

async function enter(page: Page, french = false, skipIntro = true) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/narration**", (route) => route.fulfill({ status: 503, body: "{}" }));
  await page.goto("/");
  if (french) {
    await page.getByRole("button", { name: "Language: English", exact: true }).click();
    await page.getByRole("button", { name: "Français", exact: true }).click();
  }
  await page.getByRole("button", { name: /Play an existing story|Jouer/ }).click();
  await expect(page.locator(".reader-copy h1")).toBeVisible();
  await page.getByRole("button", { name: /Reading preferences|Préférences de lecture/ }).click();
  await page
    .getByRole("combobox", { name: french ? "Affichage du texte" : "Text display" })
    .selectOption("instant");
  await page
    .getByRole("checkbox", { name: french ? "Lire à voix haute" : "Read aloud", exact: true })
    .uncheck();
  await page.locator(".reading-sidebar header button").click();
  if (skipIntro) for (let index = 0; index < 3; index++) await next(page);
}

/** Fixed character rolls (all 6) and dice seed, so a fight always ends the same way. */
async function fixDice(page: Page, seed: number) {
  await page.addInitScript((seed) => {
    crypto.getRandomValues = <T extends ArrayBufferView | null>(values: T) => {
      if (values instanceof Uint8Array) values.fill(251);
      if (values instanceof Uint32Array) values.fill(seed);
      return values;
    };
  }, seed);
}

async function dismissNotice(page: Page) {
  const check = page.locator(".check-roll-modal");
  if (await check.count()) {
    const heading = await page.locator(".reader-copy h1").textContent();
    const roll = check.getByRole("button", { name: /Lancer les|Roll dice/ });
    if (await roll.count()) {
      await expect(check.locator(".dice-result")).toHaveCount(0);
      await roll.click();
      await expect(check.locator(".dice-roll")).toBeVisible();
      await expect(page.locator(".reader-copy h1")).toHaveText(heading!);
    }
    await check.getByRole("button", { name: /Continuer|Continue/, exact: true }).click();
    await expect(check).toHaveCount(0);
  }
  const notice = page.locator(".reader-modal:not(.reader-combat-modal)");
  if (await notice.count()) await notice.locator(".reader-modal-footer button").last().click();
  await expect(page.locator(".reader")).toHaveAttribute("aria-busy", "false");
}

async function next(page: Page) {
  await page.locator(".choices button").first().click();
  await expect(page.locator(".reader")).toHaveAttribute("aria-busy", "false");
  await dismissNotice(page);
}

test("keeps character size, aligns language chevron, removes close border and preserves text width beside art", async ({
  page,
}) => {
  await enter(page);
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
  await enter(page);
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

/** Pass 7: the healing is a story page, and the HP it gave is a notification (French). */
async function careOfYsee(page: Page) {
  if ((await page.locator(".reader-copy").getAttribute("data-passage")) !== "soins") return false;
  await expect(page.locator(".reader-copy h1")).toHaveText("Les soins d’Ysée");
  const care = page.locator(".reward-card").filter({ hasText: "PV récupérés" }).last();
  await expect(care).toBeAttached();
  // Shown or waiting behind another card, it still counts down its own 10 s.
  expect(
    await care
      .locator(".reward-timer")
      .evaluate((bar) => bar.getAnimations()[0]?.playState ?? "none"),
  ).toBe("running");
  return true;
}

test("completes the French magic chapter with two combats and visible saved dice", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await fixDice(page, 1); // this seed wins both duels
  await enter(page, true);
  let encounters = 0;
  let rolls = 0;
  let victories = 0;
  let cared = false;
  for (let step = 0; step < 46; step++) {
    const combat = page.locator(".reader-combat-modal");
    if (await combat.count()) {
      encounters++;
      await expect(combat.getByRole("button", { name: /Lancer les/ })).toHaveCount(0);
      await expect(combat.locator(".combat-summary progress")).toHaveCount(2);
      await expect(combat.locator(".combatant-portrait img")).toHaveCount(2);
      await expect(combat.locator(".combatant-portrait img").first()).toBeVisible();
      await expect(combat.locator(".character-xp-track")).toHaveCount(0);
      await expect(combat.locator(".combat-ability-menu")).toHaveCount(0);
      await combat.locator(".combat-actions .reader-info summary").first().click();
      await expect(combat.locator(".reader-info[open]")).toContainText("d6");
      await expect(combat.locator(".reader-info[open] tbody tr")).toHaveCount(6);
      const tooltip = (await combat
        .locator(".reader-info[open] .reader-info-content")
        .boundingBox())!;
      expect(tooltip.x).toBeGreaterThanOrEqual(0);
      expect(tooltip.x + tooltip.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      await combat.locator(".combat-actions .reader-info summary").first().click();
      await combat.getByRole("button", { name: "Utiliser une capacit\u00e9", exact: true }).click();
      await expect(combat.locator(".combat-ability-menu button").first()).toContainText("33");
      await expect(combat.locator(".combatant-portrait")).toHaveCount(2);
      await expect(combat.locator(".combat-actions > .combat-action")).toHaveCount(4);

      await page.screenshot({ path: info.outputPath(`combat-${encounters}.png`) });
      if (encounters === 1) {
        await expect(combat.locator(".combatant-name").first()).toHaveText("Ysée Valambre");
        await combat.getByRole("button", { name: "Utiliser un objet", exact: true }).click();
        await combat
          .locator(".combat-ability-menu button")
          .filter({ hasText: "Baume de soin" })
          .click();
        await expect(
          combat.getByRole("button", { name: "Utiliser un objet", exact: true }),
        ).toBeDisabled();
        await expect(combat.locator(".combat-log li").first()).toContainText(
          "Vous utilisez Baume de soin",
        );
      }
      for (let turn = 0; (await combat.count()) && turn < 30; turn++) {
        if (await combat.locator(".combat-ending-title").count()) break;
        await combat.getByRole("button", { name: "Attaque simple", exact: true }).click();
        await expect(page.locator(".reader")).toHaveAttribute("aria-busy", "false");
        await expect(page.locator(".dice-roll")).toBeVisible();
        await expect(page.locator(".dice-result small").first()).toHaveText("d6");
        const log = combat.locator(".combat-log li");
        await expect(log.last()).toBeVisible();
        if (await page.locator(".combat-ending-title").count()) {
          // A won fight announces itself in the combat window, then continues on its own.
          await expect(page.locator(".combat-ending-title")).toHaveText("Victoire !");
          await expect(log.last()).toContainText("Vous attaquez…");
          victories++;
        } else {
          // Chronological: your attack, then the enemy's, as the newest entries.
          await expect(log.last()).toContainText("L’adversaire attaque…");
          await expect(log.nth((await log.count()) - 2)).toContainText("Vous attaquez…");
        }
        await expect(combat.locator(".combatant-hit")).toHaveCount(0); // reduced motion
        rolls++;
      }
      await expect(page.locator(".combat-ending")).toHaveCount(0, { timeout: 15000 });
    }
    await dismissNotice(page);
    cared ||= await careOfYsee(page);
    if (await page.locator(".ending").count()) break;
    await next(page);
  }
  await expect(page.locator(".ending")).toBeVisible();
  expect(cared).toBe(true);
  expect(encounters).toBe(2);
  expect(victories).toBe(2);
  expect(rolls).toBeGreaterThanOrEqual(2);
  await expect(page.locator(".reader-copy h1")).toHaveText("Laisser une lumière");
});

for (const { title, seed, move, line, french = false } of [
  { title: "Defeated", seed: 3, move: "Basic attack", line: "damage received." }, // seed 3 loses
  { title: "Escaped", seed: 1, move: "Flee", line: "You escape!" },
  { title: "Défaite", seed: 3, move: "Attaque simple", line: "dégâts subis.", french: true },
  { title: "Fuite réussie", seed: 1, move: "Fuir", line: "Vous vous échappez !", french: true },
]) {
  test(`announces "${title}" in the combat window, then continues on its own`, async ({ page }) => {
    test.setTimeout(90000);
    await fixDice(page, seed);
    await enter(page, french);
    const combat = page.locator(".reader-combat-modal");
    for (let step = 0; step < 42 && !(await combat.count()); step++) {
      await dismissNotice(page);
      await next(page);
    }
    // Pass 7: each turn plays in beats and the last one hides the actions before the outcome.
    const outcome = combat.locator(".combat-ending-title");
    const button = combat.getByRole("button", { name: move, exact: true, disabled: false });
    for (let turn = 0; turn < 30; turn++) {
      // One retrying check of the whole page: isEnabled() on a button that the last blow has
      // just removed waits for it to come back, and the ending then closed unseen.
      await expect(outcome.or(button)).toBeVisible({ timeout: 15000 });
      if (await outcome.count()) break;
      await button.click();
    }
    const ending = page.locator(".combat-ending");
    await expect(ending.locator(".combat-ending-title")).toHaveText(title);
    await expect(ending.locator(".combat-log li").last()).toContainText(line);
    await expect(
      ending.getByRole("button", { name: french ? "Continuer la lecture" : "Continue reading" }),
    ).toHaveCount(0);
    await expect(ending).toHaveCount(0, { timeout: 15000 });
    await expect(page.locator(".reader-modal")).toHaveCount(0);
  });
}

async function reachCombat(page: Page) {
  const combat = page.locator(".reader-combat-modal");
  for (let step = 0; step < 42 && !(await combat.count()); step++) {
    await dismissNotice(page);
    await next(page);
  }
  await expect(combat).toBeVisible();
  return combat;
}

test("combat: info opens from the keyboard, items open in a popup inside the window", async ({
  page,
}) => {
  test.setTimeout(90000);
  await fixDice(page, 1); // wins the duel: 8 damage dealt, 2 received on the first turn
  await enter(page);
  const combat = await reachCombat(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  // "i" opens on click and from the keyboard (shared Info, native details).
  const info = combat.locator(".combat-actions .reader-info").first();
  await info.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(info).toHaveAttribute("open", "");
  await page.keyboard.press("Enter");
  await expect(info).not.toHaveAttribute("open", "");
  // Items open in a popup inside the combat window; Escape returns to the actions.
  const items = combat.getByRole("button", { name: "Use an item", exact: true });
  await items.click();
  const popup = combat.getByRole("dialog", { name: "Use an item" });
  await expect(popup).toBeVisible();
  const inside = (await popup.boundingBox())!;
  const window = (await combat.boundingBox())!;
  expect(inside.x).toBeGreaterThanOrEqual(window.x);
  expect(inside.x + inside.width).toBeLessThanOrEqual(window.x + window.width);
  await page.keyboard.press("Escape");
  await expect(popup).toHaveCount(0);
  await expect(combat).toBeVisible();
  await expect(items).toBeFocused();
});

test("combat: two beats per turn, then the outcome between the portraits and a fade-out", async ({
  page,
}) => {
  test.setTimeout(90000);
  await fixDice(page, 1); // wins the duel: 8 damage dealt, 2 received on the first turn
  await enter(page);
  const combat = await reachCombat(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => {
    new MutationObserver(() => {
      if (document.querySelector(".reader-combat-modal.combat-closing"))
        Object.assign(window, { fadedOut: true });
    }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"] });
  });
  // Your blow, then a second later the enemy's, each with its hit and its log line.
  await combat.getByRole("button", { name: "Basic attack", exact: true }).click();
  const log = combat.locator(".combat-log li");
  await expect(log).toHaveCount(1);
  const acted = Date.now();
  await expect(log.first()).toContainText("damage dealt");
  await expect(combat.locator('[data-side="enemy"] .combatant-hit')).toBeAttached();
  await expect(combat.locator('[data-side="player"] .combatant-hit')).toHaveCount(0);
  await expect(combat.getByRole("button", { name: "Basic attack", exact: true })).toBeDisabled();
  await expect(log).toHaveCount(2);
  expect(Date.now() - acted).toBeGreaterThan(700);
  await expect(log.last()).toContainText("damage received");
  await expect(combat.locator('[data-side="player"] .combatant-hit')).toBeAttached();
  // The log keeps its height and shows the newest line.
  const height = await combat.locator(".combat-log").evaluate((list) => list.clientHeight);
  for (let turn = 0; turn < 30 && !(await combat.locator(".combat-ending-title").count()); turn++) {
    const attack = combat.getByRole("button", { name: "Basic attack", exact: true });
    if (await attack.isEnabled({ timeout: 500 }).catch(() => false)) await attack.click();
    else await page.waitForTimeout(200);
  }
  expect(await combat.locator(".combat-log").evaluate((list) => list.clientHeight)).toBe(height);
  // The outcome stands between the portraits; the defeated side fades; then the window closes.
  const title = combat.locator(".combat-ending-title");
  await expect(title).toHaveText("Victory!");
  const [enemy, player, middle] = await Promise.all(
    [
      '[data-side="enemy"] .combatant-portrait',
      '[data-side="player"] .combatant-portrait',
      ".combat-ending-title",
    ].map(async (selector) => (await combat.locator(selector).boundingBox())!),
  );
  expect(middle.x).toBeGreaterThanOrEqual(enemy!.x + enemy!.width - 1);
  expect(middle.x + middle.width).toBeLessThanOrEqual(player!.x + 1);
  await expect(combat.locator('[data-side="enemy"][data-defeated]')).toBeAttached();
  await expect(combat.locator(".combat-log li").last()).toBeInViewport();
  await expect(combat).toHaveCount(0, { timeout: 5000 });
  expect(await page.evaluate(() => "fadedOut" in window)).toBe(true);
  await expect(page.locator(".reader-copy h1")).not.toHaveText("");
});

test("reduced motion keeps every combat step and the ending, without animation", async ({
  page,
}) => {
  test.setTimeout(90000);
  await fixDice(page, 1);
  await enter(page);
  const combat = await reachCombat(page);
  await combat.getByRole("button", { name: "Basic attack", exact: true }).click();
  await expect(combat.locator(".combat-log li")).toHaveCount(2);
  await expect(combat.locator(".combatant-hit")).toHaveCount(0);
  for (let turn = 0; turn < 30 && !(await combat.locator(".combat-ending-title").count()); turn++) {
    const attack = combat.getByRole("button", { name: "Basic attack", exact: true });
    if (await attack.isEnabled({ timeout: 500 }).catch(() => false)) await attack.click();
    else await page.waitForTimeout(200);
  }
  await expect(combat.locator(".combat-ending-title")).toHaveText("Victory!");
  await expect(combat.locator('[data-side="enemy"] .combatant-portrait')).toHaveCSS(
    "opacity",
    "0.08",
  );
  expect(await combat.evaluate((node) => node.getAnimations({ subtree: true }).length)).toBe(0);
  await expect(combat).toHaveCount(0, { timeout: 6000 });
});

test("dissolves words upward while keeping the page color fixed", async ({ page }) => {
  await enter(page);
  await page.getByRole("button", { name: "Reading preferences", exact: true }).click();
  await page.getByRole("checkbox", { name: "Animated page turns", exact: true }).check();
  await page.locator(".reading-sidebar header button").click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const color = await page
    .locator(".reader")
    .evaluate((node) => getComputedStyle(node).backgroundColor);
  await page.locator(".choices button").first().click();
  await expect(page.locator(".page-word-departure span").first()).toBeVisible();
  await page.evaluate(() =>
    document
      .getAnimations()
      .filter(
        (animation) =>
          animation.effect instanceof KeyframeEffect &&
          animation.effect.target instanceof Element &&
          animation.effect.target.closest(".page-word-departure"),
      )
      .forEach((animation) => animation.pause()),
  );
  await expect(page.locator(".reader-copy h1")).toHaveText("The watch without a spring");
  await page.waitForTimeout(180);
  await expect(page.locator(".reader-copy h1")).toHaveText("The watch without a spring");
  await page.evaluate(() =>
    document
      .getAnimations()
      .filter(
        (animation) =>
          animation.effect instanceof KeyframeEffect &&
          animation.effect.target instanceof Element &&
          animation.effect.target.closest(".page-word-departure"),
      )
      .forEach((animation) => animation.play()),
  );
  await expect(page.locator(".reader")).toHaveCSS("background-color", color);
  await expect(page.locator(".reader")).toHaveCSS("opacity", "1");
  await expect(page.locator(".reader-copy h1")).toHaveText("The ninth delivery");
  await expect(page.locator(".page-word-departure")).toHaveCount(0);
  await page.getByRole("button", { name: "Previous page", exact: true }).click();
  await expect(page.locator(".reader-copy h1")).toHaveText("The watch without a spring");
  await expect(page.locator(".page-word-departure")).toHaveCount(0);
  await expect(page.locator(".reader")).toHaveCSS("background-color", color);
});

test("keeps a check on its page until its dice settle and the reader confirms", async ({
  page,
}, info) => {
  await enter(page);
  const check = page.locator(".check-roll-modal");
  for (let step = 0; step < 20 && !(await check.count()); step++) {
    await dismissNotice(page);
    await page.locator(".choices button").first().click();
    await expect(page.locator(".reader")).toHaveAttribute("aria-busy", "false");
  }
  await expect(check).toBeVisible();
  const heading = await page.locator(".reader-copy h1").textContent();
  await expect(check.locator(".dice-result")).toHaveCount(1);
  await expect(check.locator(".spell-cast-effect")).toHaveCount(1);
  await expect(check.getByRole("button", { name: "Roll dice", exact: true })).toHaveCount(0);
  async function reloadCheck() {
    await page.reload();
    await page.getByRole("button", { name: "Play an existing story", exact: true }).click();
    await expect(check).toBeVisible();
  }
  const advance = check.getByRole("button", { name: "Continue", exact: true });
  await page.screenshot({ path: info.outputPath("dice-in-flight.png") });
  await expect(advance).toBeEnabled();
  await expect(page.locator(".reader-copy h1")).toHaveText(heading!);
  await expect(check.locator(".dice-result").first()).toHaveAttribute("aria-label", /^d6: [1-6]$/);
  const savedRoll = await check.locator(".dice-result").first().getAttribute("aria-label");
  await page.screenshot({ path: info.outputPath("dice-result.png") });
  await reloadCheck();
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

test("board effects light the whole viewport, menu included", async ({ page }) => {
  await page.route("**/stories/house/en.json", async (route) => {
    const response = await route.fetch();
    const bundle = await response.json();
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
    await route.fulfill({ response, json: bundle });
  });
  await enter(page);
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
  await page.route("**/stories/house/en.json", async (route) => {
    const response = await route.fetch();
    const bundle = await response.json();
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
    await route.fulfill({ response, json: bundle });
  });
  await enter(page);
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
  const button = (await page
    .getByRole("button", { name: "Examine Nour", exact: true })
    .boundingBox())!;
  const image = (await stage.boundingBox())!;
  expect(button.y - image.y - image.height).toBeCloseTo(0, 0);
});

test("renders the numbered grey d20 model for a contextual attribute check", async ({
  page,
}, info) => {
  await enter(page);
  for (
    let step = 0;
    step < 30 && !(await page.locator(".choices button").filter({ hasText: /\/20/ }).count());
    step++
  )
    await next(page);
  const choice = page.locator(".choices button").filter({ hasText: /\/20/ }).first();
  await expect(choice).toBeVisible();
  await choice.click();
  const check = page.locator(".check-roll-modal");
  await expect(check.locator(".check-test")).toContainText("/20");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(check.getByRole("button", { name: "Roll dice", exact: true })).toHaveCount(0);
  await expect(check.locator('.dice-result[data-sides="20"] canvas')).toBeVisible();
  await expect(check.getByRole("button", { name: "Continue", exact: true })).toBeEnabled();
  await page.screenshot({ path: info.outputPath("grey-d20.png") });
});

test("waits for Fight even after restoring an encounter and animates the combat viewport", async ({
  page,
}) => {
  await enter(page);
  for (
    let step = 0;
    step < 35 &&
    !(await page
      .locator(".choices button")
      .filter({ hasText: /^Fight/ })
      .count());
    step++
  )
    await next(page);
  const combat = page.locator(".reader-combat-modal");
  await expect(combat).toHaveCount(0);
  await page
    .locator(".choices button")
    .filter({ hasText: /^Fight/ })
    .first()
    .click();
  await expect(combat).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Play an existing story", exact: true }).click();
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

test("spends three pages in the ordinary world with relevant layered art before the letter", async ({
  page,
}) => {
  await enter(page, false, false);
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

test("shows the item as a notification, fades the illustration and dissolves the heading before the next page fades in", async ({
  page,
}) => {
  await enter(page);
  await next(page);
  await page.getByRole("button", { name: "Reading preferences", exact: true }).click();
  await page.getByRole("checkbox", { name: "Animated page turns", exact: true }).check();
  await page.locator(".reading-sidebar header button").click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator(".choices button").first().click();
  // Pass 7: no window to close; the reward is a notification and the page turns on its own.
  await expect(page.locator(".reward-card")).toContainText("The letter from Orée");
  await expect(page.locator(".reader-modal")).toHaveCount(0);
  await expect(page.locator('[data-departure-heading="true"]').first()).toBeAttached();
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
  await page.waitForTimeout(500);
  await expect(page.locator(".reader-copy h1")).toHaveText("The ninth delivery");
  await expect(page.locator(".reader-copy h1")).toHaveText("A coin suspended in the air");
  await expect(page.locator(".page-word-departure")).toHaveCount(0);
  const arrival = await page
    .locator(".reader-scene")
    .evaluate((element) => getComputedStyle(element).animationDuration);
  expect(arrival).toBe("1.4s");
});

test("types graphemes smoothly while staying just one word ahead of narrated boundaries", async ({
  page,
}) => {
  await page.addInitScript(() => {
    class Utterance {
      text: string;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: Utterance,
      configurable: true,
    });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => [{ lang: "en-US", voiceURI: "test", name: "Test voice" }],
        speak: (utterance: SpeechSynthesisUtterance) => {
          (window as unknown as { spoken: SpeechSynthesisUtterance }).spoken = utterance;
        },
        cancel() {},
        pause() {},
        resume() {},
        addEventListener() {},
        removeEventListener() {},
      },
      configurable: true,
    });
  });
  await enter(page, false, false);
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
  const samples = await page.evaluate(async () => {
    const utterance = (window as unknown as { spoken: SpeechSynthesisUtterance }).spoken;
    utterance.onboundary?.({ charIndex: 0, charLength: 2 } as SpeechSynthesisEvent);
    const lengths: number[] = [];
    const until = performance.now() + 400;
    await new Promise<void>((resolve) => {
      const sample = () => {
        lengths.push(
          document.querySelector('.prose p > span[aria-hidden="true"]')?.textContent?.length ?? 0,
        );
        if (performance.now() < until) requestAnimationFrame(sample);
        else resolve();
      };
      requestAnimationFrame(sample);
    });
    return lengths;
  });
  expect(samples.some((length) => length > 3 && length < 13)).toBe(true);
  expect(samples.every((length, index) => !index || length - samples[index - 1]! <= 5)).toBe(true);
  await expect(visible).toHaveText("On Wednesdays,");
  await page.evaluate(() => {
    const utterance = (window as unknown as { spoken: SpeechSynthesisUtterance }).spoken;
    utterance.onboundary?.({ charIndex: 3, charLength: 11 } as SpeechSynthesisEvent);
  });
  await expect(visible).toHaveText("On Wednesdays, you");
});

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
  await page.evaluate(async (draft) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("listoire-editor");
      request.onupgradeneeded = () => request.result.createObjectStore("projects");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction("projects", "readwrite");
        transaction
          .objectStore("projects")
          .put({ revision: 1, draft, published: null, history: [] }, "house");
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => {
          database.close();
          reject(transaction.error);
        };
      };
    });
  }, project);
  await page.getByRole("button", { name: "Play an existing story", exact: true }).click();
  await expect(page.locator(".reader-copy h1")).toHaveText("The morning errands");
  const saved = await page.evaluate(
    async () =>
      new Promise<{ release: string; archived: string }>((resolve, reject) => {
        const request = indexedDB.open("listoire-editor");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const item = database.transaction("projects").objectStore("projects").get("house");
          item.onsuccess = () => {
            database.close();
            resolve({
              release: item.result.draft.release,
              archived: item.result.history.at(-2).project.languages.en.script,
            });
          };
          item.onerror = () => {
            database.close();
            reject(item.error);
          };
        };
      }),
  );
  expect(saved.release).toBe("oree-1.3.0");
  expect(saved.archived).toContain("Former author's note");
});

test("aligns unnamed heroes with long opponent names, shows gallery portraits and keeps every action visible after dice", async ({
  page,
}, info) => {
  await page.route("**/stories/house/en.json", async (route) => {
    const response = await route.fetch();
    const bundle = await response.json();
    delete bundle.character.name;
    bundle.game.encounters[0].name = "Ysée Valambre, head teacher of the school of Orée";
    await route.fulfill({ json: bundle });
  });
  await enter(page);
  for (
    let step = 0;
    step < 35 &&
    !(await page
      .locator(".choices button")
      .filter({ hasText: /^Fight/ })
      .count());
    step++
  )
    await next(page);
  await page
    .locator(".choices button")
    .filter({ hasText: /^Fight/ })
    .first()
    .click();
  const combat = page.locator(".reader-combat-modal");
  await expect(combat).toBeVisible();
  await expect(combat.locator(".combatant-name").nth(1)).toBeEmpty();
  await expect(combat.locator(".combatant-portrait img")).toHaveCount(2);
  await expect(combat.locator("svg.opponent-emblem")).toHaveCount(0);
  const hp = combat.locator(".combat-vital progress");
  expect((await hp.nth(0).boundingBox())!.y).toBeCloseTo((await hp.nth(1).boundingBox())!.y, 0);
  await combat.locator(".combat-actions .reader-info summary").nth(1).click();
  await expect(combat.locator(".reader-info[open] tbody tr")).toHaveCount(4);
  await expect(combat.locator('.reader-info[open] tr[data-current="true"]')).toHaveCount(1);
  await combat.locator(".combat-actions .reader-info summary").nth(1).click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await combat.getByRole("button", { name: "Basic attack", exact: true }).click();
  await expect(combat.getByRole("button", { name: "Basic attack", exact: true })).toBeEnabled();
  const actions = combat.locator(".combat-actions > .combat-action > button");
  for (let index = 0; index < 4; index++) {
    const bounds = (await actions.nth(index).boundingBox())!;
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  }
  await page.screenshot({ path: info.outputPath("compact-combat.png") });
});

test("plays instant-text illustrations from the beginning and keeps them running when all text is revealed", async ({
  page,
}) => {
  await enter(page, false, false);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Replay page", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .filter(
              (animation) =>
                animation.effect instanceof KeyframeEffect &&
                animation.effect.target instanceof Element &&
                animation.effect.target.classList.contains("multiplane-plane"),
            ).length,
      ),
    )
    .toBeGreaterThan(0);
  const times = await page.evaluate(() => {
    const animations = document
      .getAnimations()
      .filter(
        (animation) =>
          animation.effect instanceof KeyframeEffect &&
          animation.effect.target instanceof Element &&
          animation.effect.target.classList.contains("multiplane-plane"),
      );
    animations.forEach((animation, index) => {
      animation.id = `live-illustration-${index}`;
    });
    return animations.map((animation) => ({
      time: Number(animation.currentTime),
      duration: Number(animation.effect!.getTiming().duration),
    }));
  });
  expect(times.every((timing) => timing.time < timing.duration - 2000)).toBe(true);
  await page.locator(".prose p").first().click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .filter(
              (animation) =>
                animation.id.startsWith("live-illustration-") && animation.playState === "running",
            ).length,
      ),
    )
    .toBe(times.length);
});

test("starts an instant-text illustration below the fold only when it scrolls into view", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 340 });
  await enter(page, false, false);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Replay page", exact: true }).click();
  const planes = () =>
    page.evaluate(
      () =>
        document
          .getAnimations()
          .filter(
            (animation) =>
              animation.effect instanceof KeyframeEffect &&
              animation.effect.target instanceof Element &&
              animation.effect.target.classList.contains("multiplane-plane"),
          ).length,
    );
  await page.waitForTimeout(1500);
  expect(await planes()).toBe(0);
  await page.locator(".narrative-media").first().scrollIntoViewIfNeeded();
  await expect.poll(planes).toBeGreaterThan(0);
});

test("plays an ordered fullscreen illustration even when the text display is instant", async ({
  page,
}) => {
  await page.route("**/stories/house/en.json", async (route) => {
    const response = await route.fetch();
    const bundle = await response.json();
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
    await route.fulfill({ json: bundle });
  });
  await enter(page, false, false);
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
