import type { ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";

export function Info({ label, children }: { label: string; children: ReactNode }) {
  const details = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => {
    if (!open || !details.current) return;
    const element = details.current;
    const position = () => {
      const content = element.querySelector<HTMLElement>(".reader-info-content")!;
      const summary = element.querySelector("summary")!.getBoundingClientRect();
      const bounds = content.getBoundingClientRect();
      const toolbar =
        document.querySelector(".reader-toolbar")?.getBoundingClientRect().bottom ?? 0;
      content.style.left = `${Math.max(12, Math.min(summary.right - bounds.width, innerWidth - bounds.width - 12))}px`;
      content.style.top = `${Math.max(toolbar + 8, summary.top - bounds.height - 8)}px`;
    };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open, children]);
  return (
    <details
      ref={details}
      className="reader-info"
      name="reader-option-details"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary aria-label={label} title={label}>
        i
      </summary>
      <div className="reader-info-content">{children}</div>
    </details>
  );
}
