import { expect, test } from "./test.ts";
import { playStory, readTo, withExaminationReverse } from "./oree.ts";
test("the photograph magnifier samples pointer/touch coordinates and supports keyboard control", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await withExaminationReverse(page, "Do not tell her your name.");
  await page.goto("/");
  await playStory(page);
  await readTo(page, "messagere");
  const examine = page.getByRole("button", { name: "Examine Nour", exact: true });
  await examine.click();
  const viewer = page.getByRole("dialog", { name: "Nour", exact: true });
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  const surface = viewer.locator(".magnified-image");
  const image = surface.locator(":scope > img");
  await expect(image).toHaveJSProperty("complete", true);
  const bounds = (await image.boundingBox())!;
  await surface.dispatchEvent("pointermove", {
    pointerId: 1,
    pointerType: "touch",
    clientX: bounds.x + bounds.width * 0.25,
    clientY: bounds.y + bounds.height * 0.75,
  });
  const lens = viewer.locator(".magnifier-lens");
  await expect(lens).toHaveAttribute("data-x", "0.250");
  await expect(lens).toHaveAttribute("data-y", "0.750");
  await surface.focus();
  await page.keyboard.press("ArrowRight");
  await expect(lens).toHaveAttribute("data-x", "0.280");
  await page.keyboard.press("Home");
  await expect(lens).toHaveAttribute("data-x", "0.500");
  await expect(image).toHaveCSS("transform", "none");
  await page.getByRole("button", { name: "Turn over", exact: true }).click();
  await expect(viewer.locator(".photo-reverse")).toBeVisible();
  // Turning resets the view (the separate "Reset view" control was removed).
  await page.getByRole("button", { name: "Turn over", exact: true }).click();
  await expect(lens).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(examine).toBeFocused();
});
