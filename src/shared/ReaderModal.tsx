import { Dialog } from "./Dialog.tsx";
import type { ReactNode } from "react";

interface Props {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  footerActions?: ReactNode;
  onDismiss?: () => void;
  closeLabel?: string;
  className?: string;
}

/** A native modal traps focus and makes the background inert while the story is interrupted. */
export function ReaderModal({
  title,
  eyebrow,
  children,
  footerActions,
  onDismiss,
  closeLabel = "Close",
  className = "",
}: Props) {
  return (
    <Dialog className={`reader-modal ${className}`} aria-label={title} onDismiss={onDismiss}>
      <header className="reader-modal-header">
        <div>
          {eyebrow && <p className="reader-modal-eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
        </div>
        {onDismiss && (
          <button
            type="button"
            className="reader-modal-close"
            onClick={onDismiss}
            aria-label={closeLabel}
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M5 5 19 19M19 5 5 19" />
            </svg>
          </button>
        )}
      </header>
      <div className="reader-modal-content">{children}</div>
      {onDismiss && (
        <footer className="reader-modal-footer">
          {footerActions}
          <button
            className={`reader-modal-primary${footerActions ? " reader-modal-close-action" : ""}`}
            type="button"
            onClick={onDismiss}
          >
            {closeLabel}
          </button>
        </footer>
      )}
    </Dialog>
  );
}
