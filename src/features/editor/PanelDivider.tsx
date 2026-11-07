interface PanelDividerProps {
  label: string;
  value: number;
  onChange: (width: number) => void;
  reverse?: boolean;
}

export function PanelDivider({ label, value, onChange, reverse = false }: PanelDividerProps) {
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation="vertical"
      aria-valuenow={value}
      className="panel-divider"
      onKeyDown={(event) => {
        if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
          event.preventDefault();
          onChange(value + (event.key === "ArrowRight" ? 24 : -24) * (reverse ? -1 : 1));
        }
      }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.dataset.start = String(event.clientX);
        event.currentTarget.dataset.width = String(value);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          onChange(
            Number(event.currentTarget.dataset.width) +
              (event.clientX - Number(event.currentTarget.dataset.start)) * (reverse ? -1 : 1),
          );
      }}
      onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
    />
  );
}
