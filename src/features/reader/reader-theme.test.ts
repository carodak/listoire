import { expect, it } from "vitest";
import { readerTheme } from "../presentation/reader-theme.ts";

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
