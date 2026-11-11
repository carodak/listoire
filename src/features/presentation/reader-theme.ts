import type { CSSProperties } from "react";

/** The page colour the reader shows: the story's, or the default dark page. */
export const paperColor = (background = "#080b0d") =>
  /^#[a-f0-9]{6}$/i.test(background) ? background : "#080b0d";

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(color: string) {
  const channels = [1, 3, 5].map((at) => {
    const channel = parseInt(color.slice(at, at + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

/** WCAG contrast ratio of two #rrggbb colours, from 1 to 21. */
export function contrastRatio(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

export function readerTheme(background?: string, dropCapColor?: string): CSSProperties {
  const color = paperColor(background);
  const light = luminance(color) > 0.2;
  return {
    "--paper": color,
    "--drop-cap": /^#[a-f0-9]{6}$/i.test(dropCapColor ?? "") ? dropCapColor : "inherit",
    "--ink-filter": light ? "none" : "invert(1)",
    "--illustration-mix": light ? "multiply" : "screen",
    "--foreground": light ? "#191919" : "#eee5d5",
    "--muted": light ? "#615747" : "#c4b9a6",
    "--accent": light ? "#7b5825" : "#d5b67e",
    "--border": light ? "#493d2d55" : "#c4b28c55",
  } as CSSProperties;
}
