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

it("draws an author's own colour inline and keeps named colours as classes", () => {
  expect(
    render({ text: "Hi", typography: [{ start: 0, end: 2, format: { color: "336699" } }] }),
  ).toBe('<span class="narrative-type type-color-custom" style="color:#336699">Hi</span>');
  expect(
    render({
      text: "Hi",
      typography: [{ start: 0, end: 2, format: { style: "shout", color: "336699" } }],
    }),
  ).toMatch(/type-color-custom[^"]*" style="color:#336699"/);
  expect(
    render({ text: "Hi", typography: [{ start: 0, end: 2, format: { style: "shout" } }] }),
  ).toContain("type-color-crimson");
});

it("gives a point size its own class and its points, and keeps named sizes as classes", () => {
  expect(render({ text: "Hi", typography: [{ start: 0, end: 2, format: { size: "18pt" } }] })).toBe(
    '<span class="narrative-type type-size-points" style="--type-points:18">Hi</span>',
  );
  expect(render({ text: "Hi", typography: [{ start: 0, end: 2, format: { size: "huge" } }] })).toBe(
    '<span class="narrative-type type-size-huge">Hi</span>',
  );
});
