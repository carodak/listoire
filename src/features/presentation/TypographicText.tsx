import type { CSSProperties } from "react";
import type { Typography, TypographySpan } from "../../contracts/typography.ts";
import { cssColor, pointSize, typographySettings } from "../../contracts/typography.ts";
import "./typography.css";

export function TypographicText({
  text,
  typography = [],
  visible = text.length,
  reserve = false,
}: {
  text: string;
  typography?: TypographySpan[];
  visible?: number;
  /** Lay out the unrevealed text invisibly, so centred or right-aligned lines don't move. */
  reserve?: boolean;
}) {
  const shown = styledText(text, typography, visible);
  if (!reserve || visible >= text.length) return shown;
  const rest = typography
    .filter((span) => span.end > visible)
    .map((span) => ({
      ...span,
      start: Math.max(0, span.start - visible),
      end: span.end - visible,
    }));
  return (
    <>
      {shown}
      <span className="type-reserve">{styledText(text.slice(visible), rest, text.length)}</span>
    </>
  );
}

function styledText(text: string, typography: TypographySpan[], visible: number) {
  const parts = [];
  let cursor = 0;
  for (const span of typography) {
    if (span.start >= visible) break;
    parts.push(text.slice(cursor, span.start));
    parts.push(
      <StyledWords
        key={span.start}
        text={text.slice(span.start, span.end)}
        visible={Math.min(span.end, visible) - span.start}
        format={span.format}
      />,
    );
    cursor = span.end;
  }
  parts.push(text.slice(cursor, visible));
  return parts;
}

function StyledWords({
  text,
  format,
  visible,
}: {
  text: string;
  format: Typography;
  visible: number;
}) {
  const settings = typographySettings(format);
  // Named values are classes; an author's own colour or point size is an inline style.
  const color = cssColor(settings.color);
  const points = pointSize(settings.size);
  const custom: Record<string, string | undefined> = {
    color: color ? "custom" : undefined,
    size: points ? "points" : undefined,
  };
  const className = [
    "narrative-type",
    ...Object.entries(settings).map(([key, value]) => `type-${key}-${custom[key] ?? value}`),
  ].join(" ");
  const style = { color, "--type-points": points } as CSSProperties;
  const shaped = settings.shape === "wave" || settings.shape === "cascade";
  return (
    <span className={className} style={color || points ? style : undefined}>
      {shaped
        ? Array.from(
            new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text),
            (part, index) => (
              <span
                key={part.index}
                className="type-letter"
                style={
                  {
                    "--letter-offset": `${settings.shape === "wave" ? Math.sin(index * 1.2) * 0.16 : Math.min(1, index * 0.12)}em`,
                    visibility: part.index < visible ? undefined : "hidden",
                  } as CSSProperties
                }
              >
                {part.segment}
              </span>
            ),
          )
        : text.slice(0, visible)}
    </span>
  );
}
