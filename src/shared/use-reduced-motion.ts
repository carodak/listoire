import { reducedMotionMedia } from "../contracts/reduced-motion.ts";
import { useSyncExternalStore } from "react";

const query = () =>
  typeof matchMedia === "undefined" ? undefined : matchMedia(reducedMotionMedia);

function subscribe(change: () => void) {
  const media = query();
  media?.addEventListener("change", change);
  return () => media?.removeEventListener("change", change);
}

/** Live `prefers-reduced-motion: reduce`; updates when the OS setting changes. */
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => query()?.matches ?? false,
    () => false,
  );
}
