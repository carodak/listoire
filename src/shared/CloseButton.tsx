import { useTranslation } from "react-i18next";

interface CloseButtonProps {
  onClick: () => void;
  /** Accessible name; defaults to the translated "Close". */
  label?: string;
  title?: string;
  className?: string;
}

/** The one close (×) control used by every dialog, modal and side panel. */
export function CloseButton({ onClick, label, title, className }: CloseButtonProps) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-label={label ?? t("close")}
      title={title}
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
  );
}
