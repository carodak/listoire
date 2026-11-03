import { expect, test } from "@playwright/test";
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
