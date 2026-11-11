import type { StoryProject } from "../../contracts/editor-project.ts";
import type { ParagraphAlign, Typography, TypographySpan } from "../../contracts/typography.ts";
import {
  effectiveTypography,
  paragraphAlignments,
  parseTypography,
  TypographySchema,
} from "../../contracts/typography.ts";

const instruction = /^\s*(?:~|VAR\b|CONST\b|LIST\b|={2,}|->|\/\/)/;

const typoTags = (line: string) => [...line.matchAll(/<\/?typo\b[^>]*>/g)];
const within = (tag: RegExpExecArray, column: number) =>
  column > tag.index && column < tag.index + tag[0].length;

/** True when `column` is inside `<typo>` markup, where Undo can leave the caret. */
export const insideMarkup = (line: string, column: number) =>
  typoTags(line).some((tag) => within(tag, column));

/** Maps a column of the raw line to an offset in its text without `<typo>` tags. */
function plainOffsets(line: string) {
  const tags = typoTags(line);
  const offset = (column: number) =>
    column -
    tags
      .filter((tag) => tag.index + tag[0].length <= column)
      .reduce((sum, tag) => sum + tag[0].length, 0);
  /** The span whose tag markup holds `column`, if any. */
  const tagged = (column: number, spans: TypographySpan[]) => {
    const tag = tags.find((tag) => within(tag, column));
    if (!tag) return;
    const closing = tag[0] === "</typo>";
    const point = offset(closing ? tag.index : tag.index + tag[0].length);
    return spans.find((span) => (closing ? span.end : span.start) === point);
  };
  return { offset, tagged };
}

function narrativeSelection(line: string, start: number, end: number) {
  if (start === end && !insideMarkup(line, start))
    throw new Error("Select words in the Ink script first.");
  if (
    start < 0 ||
    end > line.length ||
    start > end ||
    instruction.test(line) ||
    /#/.test(line.slice(0, start))
  )
    throw new Error("Select narrative words, excluding Ink instructions and tags.");
  const { offset, tagged } = plainOffsets(line);
  const { text, typography = [] } = parseTypography(line);
  // An end inside a tag's markup takes in all the words that tag formats.
  const from = tagged(start, typography)?.start ?? offset(start),
    to = tagged(end, typography)?.end ?? offset(end);
  const selected = text.slice(from, to);
  if (!selected.trim() || /[\r\n#{}[\]]/.test(selected))
    throw new Error("Select narrative words within one line, excluding Ink tags and expressions.");
  return { text, typography, from, to };
}

const meaningful = (format: Typography) =>
  Object.keys(format).some((key) => key !== "style") ||
  (format.style !== undefined && format.style !== "default");
const sameFormat = (a: Typography, b: Typography) =>
  Object.keys(a).length === Object.keys(b).length &&
  (Object.keys(a) as (keyof Typography)[]).every((key) => a[key] === b[key]);

/** Rewrites each styled piece of the selection with `change`; unselected words keep theirs. */
function restyle(
  line: string,
  start: number,
  end: number,
  change: (format: Typography) => Typography,
) {
  const { text, typography, from, to } = narrativeSelection(line, start, end);
  const spans = typography.flatMap((span) => {
    if (span.end <= from || span.start >= to) return [span];
    return [
      ...(span.start < from ? [{ ...span, end: from }] : []),
      ...(span.end > to ? [{ ...span, start: to }] : []),
    ];
  });
  const inside: TypographySpan[] = [];
  const add = (pieceStart: number, pieceEnd: number, format: Typography) => {
    const next = change(format);
    const last = inside.at(-1);
    if (!meaningful(next)) return;
    if (last?.end === pieceStart && sameFormat(last.format, next)) last.end = pieceEnd;
    else inside.push({ start: pieceStart, end: pieceEnd, format: next });
  };
  let cursor = from;
  for (const span of typography) {
    if (span.end <= from || span.start >= to) continue;
    const pieceStart = Math.max(span.start, from);
    if (pieceStart > cursor) add(cursor, pieceStart, {});
    cursor = Math.min(span.end, to);
    add(pieceStart, cursor, span.format);
  }
  if (cursor < to) add(cursor, to, {});
  return {
    start: 0,
    end: line.length,
    ...serialize(
      text,
      [...spans, ...inside].sort((a, b) => a.start - b.start),
      from,
      to,
    ),
  };
}

/** Gives the selected words exactly `format`: a preset alone, or nothing (clear formatting). */
export function formatTextSelection(line: string, start: number, end: number, format: Typography) {
  const settings = TypographySchema.parse(format);
  return restyle(line, start, end, () => settings);
}

/**
 * Changes only the given settings and keeps the others, piece by piece. A value equal to what
 * the piece's preset (or plain text) gives is not a change, so it is removed.
 */
export function patchTextSelection(
  line: string,
  start: number,
  end: number,
  patch: Omit<Typography, "style">,
) {
  return restyle(line, start, end, (format) => {
    const next: Record<string, string> = { ...format };
    const inherited: Record<string, string> = effectiveTypography({ style: format.style });
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || inherited[key] === value) delete next[key];
      else next[key] = value;
    }
    return TypographySchema.parse(next);
  });
}

/** The settings of the words at `column`, or of the tag it is in; plain text has none. */
export function formatAt(line: string, column: number): Typography {
  try {
    const { offset, tagged } = plainOffsets(line);
    const spans = parseTypography(line).typography ?? [];
    const point = offset(column);
    const span = tagged(column, spans) ?? spans.find((s) => s.start <= point && point < s.end);
    return span?.format ?? {};
  } catch {
    return {};
  }
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

const notNarrative =
  /^\s*(?:$|~|VAR\b|CONST\b|LIST\b|INCLUDE\b|EXTERNAL\b|=|->|\/\/|\*|\+|#|\{|\})/;
const alignmentTag = /\s*#\s*align:\s*[a-z]*/g;
const segmentId = (line: string) => line.match(/#\s*segment:([a-z][a-z0-9.-]*)/)?.[1];

/** A line the reader shows as a paragraph (not a choice, knot, comment or instruction). */
export const isParagraphLine = (line: string) => !notNarrative.test(line);

export function lineAlignment(line: string): ParagraphAlign {
  const value = line.match(/#\s*align:\s*([a-z]+)/)?.[1];
  return paragraphAlignments.find((align) => align === value) ?? "left";
}

/** Sets a paragraph's `# align:` tag; left, the default, removes it. Other lines are kept. */
export function alignLine(line: string, align: ParagraphAlign) {
  if (!isParagraphLine(line)) return line;
  const plain = line.replace(alignmentTag, "").trimEnd();
  return align === "left" ? plain : `${plain} # align:${align}`;
}

/** Aligns the same paragraphs (same `# segment:` ID) in the other translations. */
export function alignTranslations(
  project: StoryProject,
  locale: string,
  lines: string[],
  align: ParagraphAlign,
): StoryProject {
  const ids = new Set(lines.filter(isParagraphLine).flatMap((line) => segmentId(line) ?? []));
  if (!ids.size) return project;
  const languages = Object.fromEntries(
    Object.entries(project.languages).map(([id, language]) => [
      id,
      id === locale
        ? language
        : {
            ...language,
            script: language.script
              .split("\n")
              .map((line) => (ids.has(segmentId(line) ?? "") ? alignLine(line, align) : line))
              .join("\n"),
          },
    ]),
  );
  return { ...project, languages };
}
