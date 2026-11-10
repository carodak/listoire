import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { TypographicText } from "./TypographicText.tsx";

const render = (props: Parameters<typeof TypographicText>[0]) =>
  renderToStaticMarkup(createElement(TypographicText, props));

it("lays out unrevealed text invisibly only when asked, keeping its styles", () => {
  const typography = [{ start: 2, end: 5, format: { color: "ocean" as const } }];
  expect(render({ text: "Hello", typography, visible: 3 })).toBe(
    'He<span class="narrative-type type-color-ocean">l</span>',
  );
  expect(render({ text: "Hello", typography, visible: 3, reserve: true })).toBe(
    'He<span class="narrative-type type-color-ocean">l</span>' +
      '<span class="type-reserve"><span class="narrative-type type-color-ocean">lo</span></span>',
  );
  expect(render({ text: "Hello", typography, reserve: true })).toBe(
    'He<span class="narrative-type type-color-ocean">llo</span>',
  );
});
