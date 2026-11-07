import type { CSSProperties } from "react";

export function readerTheme(background = "#080b0d", dropCapColor?: string): CSSProperties {
  const color = /^#[a-f0-9]{6}$/i.test(background) ? background : "#080b0d";
  const channels = [1, 3, 5].map((at) => {
    const channel = parseInt(color.slice(at, at + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const light = channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722 > 0.2;
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
