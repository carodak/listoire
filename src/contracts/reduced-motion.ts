/** The media query behind the system "reduce motion" setting. */
export const reducedMotionMedia = "(prefers-reduced-motion: reduce)";

/** Whether the reader asked for less motion; false outside a browser (tests, tools). */
export function prefersReducedMotion() {
  return typeof matchMedia !== "undefined" && matchMedia(reducedMotionMedia).matches;
}
