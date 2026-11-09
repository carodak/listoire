import { expect, it } from "vitest";
import { narrationLead, advanceReveal, revealParagraphs } from "./text-reveal.ts";

it("retains typography and reveals whole graphemes across paragraphs", () => {
  const text = "A👩🏽‍🚀é";
  const typography = [{ start: 1, end: text.length, format: { style: "shout" as const } }];
  const letters = Array.from(
    new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text),
    (part) => ({ text: part.segment, end: part.index + part.segment.length }),
  );
  const input = [
    { id: "one", text, typography, letters },
    { id: "two", text: "B", letters: [{ text: "B", end: 1 }] },
  ];
  expect(revealParagraphs(input, 2, false)).toMatchObject([
    { text, typography, visible: "A👩🏽‍🚀" },
    { visible: "" },
  ]);
  expect(revealParagraphs(input, 4, false).map((part) => part.visible)).toEqual([text, "B"]);
  expect(revealParagraphs(input, 0, true).map((part) => part.visible)).toEqual([text, "B"]);
});

function segments(...texts: string[]) {
  return texts.map((text, index) => ({
    id: String(index),
    text,
    letters: Array.from(
      new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text),
      (part) => ({ end: part.index + part.segment.length }),
    ),
  }));
}
it("shows only the next word, including across paragraph boundaries", () => {
  const text = segments("One two three", "Four five six");
  expect(narrationLead(text, {})).toBe(3);
  expect(narrationLead(text, { "0": 3 })).toBe(7);
  expect(narrationLead(text, { "0": 13 })).toBe(17);
  expect(narrationLead(text, { "0": 13, "1": 4 })).toBe(22);
  expect(narrationLead(text, { "0": 13, "1": 13 })).toBe(26);
});
it("preserves whole Unicode graphemes while moving through the following word", () => {
  expect(narrationLead(segments("\u00e9\ud83d\ude00 next later"), { "0": 1 })).toBe(4);
});
it("advances inside the following word instead of holding a word-sized target", () => {
  const text = segments("Silver apples slowly");
  const limits = Array.from({ length: 7 }, (_, cursor) => narrationLead(text, { "0": cursor }));
  expect(limits).toEqual([6, 8, 9, 10, 11, 12, 13]);
});
it("spreads narrated letters across the word instead of a fast burst followed by a long wait", () => {
  let cursor = 0;
  const changes: number[] = [];
  let previous = 0;
  for (let time = 16; time <= 2000; time += 16) {
    cursor = advanceReveal(cursor, 16, 6 + Math.floor(time / 350) * 6, true);
    const visible = Math.floor(cursor);
    if (visible > previous) changes.push(time);
    previous = visible;
  }
  expect(changes.length).toBeGreaterThan(25);
  expect(changes.every((time, index) => !index || time - changes[index - 1]! <= 96)).toBe(true);
});
it("types individual graphemes smoothly up to the next word without jumping a whole word", () => {
  const limit = narrationLead(segments("One two three"), { "0": 3 });
  let cursor = 0;
  for (let index = 1; index <= 7; index++) {
    cursor = advanceReveal(cursor, 13, limit);
    expect(Math.floor(cursor)).toBe(index);
  }
  expect(advanceReveal(cursor, 64, limit)).toBe(7);
  expect(advanceReveal(cursor, 13, 13)).toBe(8);
});
