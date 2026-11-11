/** Compact, consistent icons; buttons provide their own accessible labels. */
import type { SVGProps } from "react";
export type ToolbarGlyphName =
  | "chevron"
  | "back"
  | "replay"
  | "pause"
  | "play"
  | "settings"
  | "skip"
  | "reveal"
  | "eye"
  | "eyeOff";
const common = {
  width: 21,
  height: 21,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};
const paths = {
  chevron: <path d="m5 7.5 5 5 5-5" />,
  back: (
    <>
      <path d="M9 7 4 12l5 5" />
      <path d="M4 12h10a6 6 0 0 1 6 6" />
    </>
  ),
  replay: (
    <>
      <path d="M4 11a8 8 0 1 1 2.7 6.1" />
      <path d="M4 4v7h7" />
    </>
  ),
  pause: (
    <>
      <rect x="6" y="5" width="4" height="14" rx=".8" fill="currentColor" stroke="none" />
      <rect x="14" y="5" width="4" height="14" rx=".8" fill="currentColor" stroke="none" />
    </>
  ),
  play: <path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15.3 21 14v-4l-1.6-1.3.3-2.1-3.4-2-1.8 1.1L12 4 9.5 5.7 7.7 4.6l-3.4 2 .3 2.1L3 10v4l1.6 1.3-.3 2.1 3.4 2 1.8-1.1L12 20l2.5-1.7 1.8 1.1 3.4-2z" />
    </>
  ),
  skip: (
    <>
      <path d="m4 5 9 7-9 7z" />
      <path d="M18 5v14" />
    </>
  ),
  reveal: (
    <>
      <path d="m4 6 8 6-8 6z" />
      <path d="m13 6 8 6-8 6z" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <path d="m4 4 16 16" />
    </>
  ),
};
export function ToolbarGlyph({
  name,
  ...props
}: { name: ToolbarGlyphName } & SVGProps<SVGSVGElement>) {
  return (
    <svg {...common} {...props}>
      {paths[name]}
    </svg>
  );
}
