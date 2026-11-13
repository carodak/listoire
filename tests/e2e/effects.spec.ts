import { expect, test } from "./test.ts";
test("all eleven native effects settle, cancel, pause and respect reduced motion", async ({
  page,
}) => {
  await page.goto("/");
  const results = await page.evaluate(async (modulePath) => {
    const { EffectsEngine } = (await import(
      modulePath
    )) as typeof import("../../src/features/presentation/effects.ts");
    const root = document.createElement("div");
    root.style.cssText = "position:fixed;top:0;left:0;width:300px;height:200px";
    const image = document.createElement("div");
    const old = document.createElement("div");
    root.append(image, old);
    document.body.append(root);
    const effects = [
      { id: "fade-in" },
      { id: "fade-out" },
      { id: "crossfade" },
      { id: "screen-shake", intensity: 0.3 },
      { id: "light-flicker", intensity: 0.1 },
      { id: "slow-zoom", scale: 1.1 },
      { id: "camera-pan", x: 2, y: 1 },
      { id: "parallax", x: 1, y: 1 },
      { id: "rain-overlay", intensity: 0.2 },
      { id: "fog-overlay", intensity: 0.2 },
      { id: "cinematic-wipe", direction: "right" },
    ];
    const engine = new EffectsEngine();
    const states = [];
    let composed = { scale: "", translate: "" };
    const fades: string[] = [];
    for (const effect of effects) {
      const scope = new AbortController();
      const playback = engine.play(
        { ...effect, duration: 20 } as import("../../src/contracts/native-effects.ts").NativeEffect,
        { canvas: root, image, previousImage: old },
        scope.signal,
        false,
      );
      states.push(await playback);
      if (["fade-in", "fade-out", "crossfade"].includes(effect.id))
        fades.push(getComputedStyle(image).opacity);
      if (effect.id === "camera-pan")
        composed = {
          scale: getComputedStyle(image).scale,
          translate: getComputedStyle(image).translate,
        };
    }
    const scope = new AbortController();
    const active = engine.play(
      { id: "fog-overlay", duration: 500 },
      { canvas: root, image },
      scope.signal,
      false,
    );
    engine.pause();
    engine.resume();
    scope.abort();
    states.push(await active);
    const reduced = engine.play(
      { id: "screen-shake", duration: 500 },
      { canvas: root, image },
      new AbortController().signal,
      true,
    );
    states.push(await reduced);
    const overlays = root.querySelectorAll(".cinematic-overlay").length;
    const fadedPrevious = getComputedStyle(old).opacity;
    engine.stop();
    const animations = root.getAnimations({ subtree: true }).length;
    const reset = { scale: image.style.scale, translate: image.style.translate };
    root.remove();
    return {
      states,
      overlays,
      animations,
      composed,
      reset,
      fades,
      fadedPrevious,
      oldOpacity: old.style.opacity,
    };
  }, "/src/features/presentation/effects.ts");
  expect(results.states.slice(0, 11)).toEqual(Array(11).fill("ended"));
  expect(results.states.slice(11)).toEqual(["aborted", "ended"]);
  expect(results.overlays).toBe(0);
  expect(results.animations).toBe(0);
  expect(results.composed).toEqual({ scale: "1.1", translate: "2% 1%" });
  expect(results.reset).toEqual({ scale: "", translate: "" });
  expect(results.fades).toEqual(["1", "0", "1"]);
  expect(results.fadedPrevious).toBe("0");
  expect(results.oldOpacity).toBe("");
});

test("all fourteen official components load on demand and the guarded layer unmounts", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/tests/fixtures/react-bits.html");
  const modules = await page.evaluate(async (path) => {
    const { reactBitsLoaders } = await import(path);
    const results = [];
    for (const [id, loader] of Object.entries(reactBitsLoaders)) {
      const module = await (loader as () => Promise<{ default: unknown }>)();
      results.push([id, typeof module.default]);
    }
    return results;
  }, "/src/features/presentation/react-bits/registry.ts");
  expect(modules).toHaveLength(14);
  expect(modules.every((entry) => entry[1] === "function")).toBe(true);
  for (const [id] of modules) {
    await page.getByLabel("Effect").selectOption(id!);
    await expect(page.locator(".react-bits-layer")).toHaveAttribute("data-effect", id!);
    await page.getByLabel("Effect").selectOption("");
    await expect(page.locator(".react-bits-layer")).toHaveCount(0);
  }
  await page.getByLabel("Effect").selectOption("react-bits.noise");
  await expect(page.locator(".react-bits-layer canvas")).toBeVisible();
  await page.getByLabel("Effect").selectOption("");
  await expect(page.locator(".react-bits-layer canvas")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByLabel("Effect").selectOption("react-bits.noise");
  await expect(page.locator(".react-bits-layer canvas")).toHaveCount(0);
});
