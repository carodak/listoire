import type { KeyboardEvent } from "react";

/** Tablist onKeyDown: ←/→ select and focus the previous/next tab, wrapping around. */
export function arrowKeyTabs<T>(tabs: readonly T[], current: T, select: (tab: T) => void) {
  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = (tabs.indexOf(current) + direction + tabs.length) % tabs.length;
    select(tabs[next]!);
    event.currentTarget.querySelectorAll<HTMLElement>("[role=tab]")[next]?.focus();
  };
}
