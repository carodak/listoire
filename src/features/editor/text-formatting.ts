import type { Typography, TypographySpan } from "../../contracts/typography.ts";
import { parseTypography, TypographySchema } from "../../contracts/typography.ts";

export function formatTextSelection(line: string, start: number, end: number, format: Typography) {
  if (start === end) throw new Error("Select words in the Ink script first.");
  if (
    start < 0 ||
    end > line.length ||
    start > end ||
    /^\s*(?:~|VAR\b|CONST\b|LIST\b|={2,}|->|\/\/)/.test(line) ||
    /#/.test(line.slice(0, start))
  )
    throw new Error("Select narrative words, excluding Ink instructions and tags.");
  const tags = [...line.matchAll(/<\/?typo\b[^>]*>/g)];
  if (
    tags.some((tag) =>
      [start, end].some((point) => point > tag.index && point < tag.index + tag[0].length),
    )
  )
    throw new Error("Select words outside the typography tag attributes.");
  const plainOffset = (offset: number) =>
    offset -
    tags
      .filter((tag) => tag.index + tag[0].length <= offset)
      .reduce((sum, tag) => sum + tag[0].length, 0);
  const from = plainOffset(start),
    to = plainOffset(end);
  const { text, typography = [] } = parseTypography(line);
  const selected = text.slice(from, to);
  if (!selected.trim() || /[\r\n#{}[\]]/.test(selected))
    throw new Error("Select narrative words within one line, excluding Ink tags and expressions.");
  const settings = TypographySchema.parse(format);
  const spans = typography.flatMap((span) => {
    if (span.end <= from || span.start >= to) return [span];
    return [
      ...(span.start < from ? [{ ...span, end: from }] : []),
      ...(span.end > to ? [{ ...span, start: to }] : []),
    ];
  });
  if (
    Object.keys(settings).some((key) => key !== "style") ||
    (settings.style && settings.style !== "default")
  )
    spans.push({ start: from, end: to, format: settings });
  return {
    start: 0,
    end: line.length,
    ...serialize(
      text,
      spans.sort((a, b) => a.start - b.start),
      from,
      to,
    ),
  };
}

function serialize(text: string, spans: TypographySpan[], from: number, to: number) {
  let replacement = "",
    cursor = 0;
  const selection = { start: 0, end: 0 };
  const append = (start: number, end: number) => {
    if (from >= start && from <= end) selection.start = replacement.length + from - start;
    if (to >= start && to <= end) selection.end = replacement.length + to - start;
    replacement += text.slice(start, end);
  };
  for (const span of spans) {
    append(cursor, span.start);
    replacement += `<typo${Object.entries(span.format)
      .map(([key, value]) => ` ${key}="${value}"`)
      .join("")}>`;
    append(span.start, span.end);
    replacement += "</typo>";
    cursor = span.end;
  }
  append(cursor, text.length);
  return { replacement, selection };
}
