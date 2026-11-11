import { z } from "zod";

export const typographyOptions = {
  style: ["default", "shout", "whisper", "mystery", "impact", "handwritten", "wave", "falling"],
  size: ["normal", "small", "large", "huge"],
  font: ["inherit", "serif", "sans", "mono", "handwritten"],
  color: ["inherit", "crimson", "ocean", "forest", "gold", "violet"],
  direction: ["horizontal", "diagonal-up", "diagonal-down", "vertical"],
  spacing: ["normal", "wide", "extra-wide"],
  shape: ["normal", "wave", "cascade", "outline"],
  // "off" lets a manual change turn off what a preset sets (Whisper without italic).
  bold: ["on", "off"],
  italic: ["on", "off"],
  underline: ["on", "off"],
  strike: ["on", "off"],
} as const;

/** Per-paragraph alignment, from an Ink `# align:` tag; "left" is the default and never stored. */
export const paragraphAlignments = ["left", "center", "right", "justify"] as const;
export type ParagraphAlign = (typeof paragraphAlignments)[number];

const customColor = /^[0-9a-f]{6}$/;
/** The CSS colour of an author's own colour ("336699" → "#336699"); undefined for named ones. */
export const cssColor = (color?: string) =>
  color && customColor.test(color) ? `#${color}` : undefined;

/** The points of a point size ("14pt" → 14), from 8 to 48; undefined for named sizes. */
export function pointSize(size?: string) {
  const points = Number(size?.match(/^([1-9]\d?)pt$/)?.[1]);
  return points >= 8 && points <= 48 ? points : undefined;
}

export const TypographySchema = z
  .object({
    style: z.enum(typographyOptions.style).optional(),
    // A named size, or a point size from 8 to 48 ("14pt"; 12 pt is the reader's text size).
    size: z
      .union([
        z.enum(typographyOptions.size),
        z.string().refine((size) => pointSize(size) !== undefined),
      ])
      .optional(),
    font: z.enum(typographyOptions.font).optional(),
    // A named colour (it adapts to light and dark pages) or any colour as six lowercase hex
    // digits, without "#": in Ink, "#" starts a tag anywhere on a line.
    color: z.union([z.enum(typographyOptions.color), z.string().regex(customColor)]).optional(),
    direction: z.enum(typographyOptions.direction).optional(),
    spacing: z.enum(typographyOptions.spacing).optional(),
    shape: z.enum(typographyOptions.shape).optional(),
    bold: z.enum(typographyOptions.bold).optional(),
    italic: z.enum(typographyOptions.italic).optional(),
    underline: z.enum(typographyOptions.underline).optional(),
    strike: z.enum(typographyOptions.strike).optional(),
  })
  .strict();
export type Typography = z.infer<typeof TypographySchema>;
export const TypographySpanSchema = z
  .object({
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
    format: TypographySchema,
  })
  .strict();
export type TypographySpan = z.infer<typeof TypographySpanSchema>;

const presets: Record<NonNullable<Typography["style"]>, Typography> = {
  default: {},
  shout: { size: "huge", font: "sans", color: "crimson", bold: "on" },
  whisper: { size: "small", spacing: "wide", italic: "on" },
  mystery: { font: "serif", color: "violet", spacing: "wide" },
  impact: { size: "large", font: "sans", shape: "outline", bold: "on" },
  handwritten: { font: "handwritten", color: "ocean" },
  wave: { shape: "wave", color: "ocean" },
  falling: { shape: "cascade" },
};
export function typographySettings(format: Typography): Typography {
  return { ...presets[format.style ?? "default"], ...format };
}

const plain = {
  size: "normal",
  font: "inherit",
  color: "inherit",
  direction: "horizontal",
  spacing: "normal",
  shape: "normal",
  bold: "off",
  italic: "off",
  underline: "off",
  strike: "off",
} as const satisfies Required<Omit<Typography, "style">>;
/** Every setting these words really get: manual changes, then the preset, then plain text. */
export function effectiveTypography(format: Typography): Required<Typography> {
  return { style: "default", ...plain, ...typographySettings(format) };
}

function attributes(tag: string): Typography {
  const source = tag.slice(5, -1);
  const entries = [...source.matchAll(/\s+([a-z]+)="([a-z0-9-]+)"/g)];
  if (
    source.replace(/\s+([a-z]+)="([a-z0-9-]+)"/g, "").trim() ||
    new Set(entries.map((entry) => entry[1])).size !== entries.length
  )
    throw new Error("Invalid typography attributes. Use the Text ribbon to format words.");
  return TypographySchema.parse(Object.fromEntries(entries.map((entry) => [entry[1], entry[2]])));
}

/** Decode only our allowlisted markup; all other text remains literal, never HTML. */
export function parseTypography(source: string): { text: string; typography?: TypographySpan[] } {
  let text = "",
    cursor = 0;
  let active: { start: number; format: Typography } | undefined;
  const typography: TypographySpan[] = [];
  for (const match of source.matchAll(/<\/?typo\b[^>]*>/g)) {
    const chunk = source.slice(cursor, match.index);
    if (active && /[\r\n]/.test(chunk))
      throw new Error("Typography must stay within one paragraph.");
    text += chunk;
    cursor = match.index + match[0].length;
    if (match[0] === "</typo>") {
      if (!active || active.start === text.length)
        throw new Error("Empty or unmatched typography.");
      typography.push({ start: active.start, end: text.length, format: active.format });
      active = undefined;
      continue;
    }
    if (active) throw new Error("Typography cannot be nested.");
    active = { start: text.length, format: attributes(match[0]) };
  }
  if (active) throw new Error("Missing </typo> after styled words.");
  text += source.slice(cursor);
  if (/<\/?typo\b/.test(text)) throw new Error("Malformed typography tag.");
  return typography.length ? { text, typography } : { text };
}

export function validTypographySpans(value: { text: string; typography?: TypographySpan[] }) {
  let end = 0;
  return (value.typography ?? []).every((span) => {
    const valid = span.start >= end && span.end > span.start && span.end <= value.text.length;
    end = span.end;
    return valid;
  });
}
