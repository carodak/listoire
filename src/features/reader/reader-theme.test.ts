import { expect, it } from "vitest";
import { contrastRatio, paperColor, readerTheme } from "../presentation/reader-theme.ts";

it("keeps text readable for light and dark reader backgrounds and rejects invalid CSS", () => {
  expect(readerTheme("#ffffff")).toMatchObject({
    "--paper": "#ffffff",
    "--foreground": "#191919",
    "--ink-filter": "none",
  });
  expect(readerTheme("#000000")).toMatchObject({
    "--paper": "#000000",
    "--foreground": "#eee5d5",
    "--ink-filter": "invert(1)",
  });
  expect(readerTheme("url(https://invalid)")).toEqual(readerTheme());
});

it("measures WCAG contrast against the page the reader shows", () => {
  expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21);
  expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21);
  expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  expect(paperColor()).toBe("#080b0d");
  expect(paperColor("url(x)")).toBe("#080b0d");
  expect(paperColor("#f4ecd8")).toBe("#f4ecd8");
});
