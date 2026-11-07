import type { InputHTMLAttributes } from "react";

export function Field({
  label,
  help,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; help?: string }) {
  return (
    <label title={help}>
      {label}
      <input {...props} />
    </label>
  );
}
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  help,
  labels,
  disabled = false,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  help?: string;
  disabled?: boolean;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <label title={help}>
      {label}
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const value = options.find((value) => value === event.target.value);
          if (value !== undefined) onChange(value);
        }}
      >
        {options.map((value) => (
          <option key={value} value={value}>
            {labels?.[value] ?? value}
          </option>
        ))}
      </select>
    </label>
  );
}
