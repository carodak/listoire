interface DurationFieldProps {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  help: string;
}

export function DurationField({ label, min, max, value, onChange, help }: DurationFieldProps) {
  return (
    <>
      <label>
        {label}
        <input
          type="number"
          min={min}
          max={max}
          step="0.01"
          value={value || ""}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </label>
      <p>{help}</p>
    </>
  );
}
