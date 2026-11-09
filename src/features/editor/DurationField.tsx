import { Field } from "./Fields.tsx";

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
      <Field
        label={label}
        type="number"
        min={min}
        max={max}
        step="0.01"
        value={value || ""}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <p>{help}</p>
    </>
  );
}
