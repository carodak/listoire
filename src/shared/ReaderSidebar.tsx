import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";

interface ReaderSidebarProps {
  id: string;
  label: string;
  className: string;
  onClose: () => void;
  children: ReactNode;
}

/** Non-modal reader side panel: takes focus when opened, returns it on close, Escape closes. */
export function ReaderSidebar({ id, label, className, onClose, children }: ReaderSidebarProps) {
  const panel = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    // Safari does not focus a clicked button: fall back to the toggle that controls this panel.
    const opener =
      document.activeElement && document.activeElement !== document.body
        ? document.activeElement
        : document.querySelector(`[aria-controls="${id}"]`);
    panel.current?.focus({ preventScroll: true });
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected)
        opener.focus({ preventScroll: true });
    };
  }, []);
  return (
    <aside
      ref={panel}
      id={id}
      tabIndex={-1}
      className={`reader-sidebar ${className}`}
      aria-label={label}
      onKeyDown={(event) => {
        // Escape inside a nested modal, or already handled (e.g. colour sampling), is not ours.
        if (event.key !== "Escape" || event.defaultPrevented) return;
        if ((event.target as Element).closest("dialog")) return;
        onClose();
      }}
    >
      {children}
    </aside>
  );
}
