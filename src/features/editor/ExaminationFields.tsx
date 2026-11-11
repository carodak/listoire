import { CheckboxField, Field, TextareaField } from "./Fields.tsx";
import type { ImageExamination } from "../../contracts/presentation.ts";
import { examinationDraft } from "./media-form.ts";

interface ExaminationFieldsProps {
  value: ImageExamination | null;
  onChange: (value: ImageExamination | null) => void;
  locale: string;
}

export function ExaminationFields({ value, onChange, locale }: ExaminationFieldsProps) {
  const set = (patch: Partial<ImageExamination>) => onChange({ ...value!, ...patch });
  return (
    <fieldset>
      <legend>Image examination</legend>
      <CheckboxField
        label="Media examinable"
        checked={Boolean(value)}
        onChange={(event) => onChange(event.target.checked ? examinationDraft(null, locale) : null)}
      />
      {value && (
        <>
          <Field
            label="Examine button label"
            maxLength={100}
            value={value.buttonLabel ?? ""}
            onChange={(event) => set({ buttonLabel: event.target.value })}
          />
          <Field
            label="Examination title"
            required
            maxLength={100}
            value={value.title}
            onChange={(event) => set({ title: event.target.value })}
          />
          <TextareaField
            label="Image details (one per line)"
            value={value.descriptions.join("\n")}
            onChange={(event) => set({ descriptions: event.target.value.split("\n") })}
          />
          <TextareaField
            label="Text on the reverse (optional)"
            maxLength={5000}
            value={value.reverse}
            onChange={(event) => set({ reverse: event.target.value })}
          />
          <p>
            The reader can magnify the image, browse its details and turn it over when reverse text
            is provided.
          </p>
        </>
      )}
    </fieldset>
  );
}
