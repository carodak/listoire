import type {
  ChangeEvent,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

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
export function CheckboxField({
  label,
  help,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; help?: string }) {
  return (
    <label className="check" title={help}>
      <input {...props} type="checkbox" />
      {label}
    </label>
  );
}
export function TextareaField({
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label>
      {label}
      <textarea {...props} />
    </label>
  );
}
export function SelectField<T extends string>({
  label,
  options,
  onChange,
  help,
  labels,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value" | "defaultValue"> & {
  label: string;
  value?: T;
  defaultValue?: T;
  options: readonly T[];
  onChange?: (value: T) => void;
  help?: string;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <label title={help}>
      {label}
      <select
        {...props}
        aria-label={props["aria-label"] ?? label}
        onChange={(event) => {
          const value = options.find((value) => value === event.target.value);
          if (value !== undefined) onChange?.(value);
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

/** A file input's onChange: uploads the chosen file, then clears the input so it can be chosen again. */
export function uploadChosenFile(upload: (file: File) => Promise<unknown>) {
  return (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (file)
      void upload(file).finally(() => {
        input.value = "";
      });
  };
}
