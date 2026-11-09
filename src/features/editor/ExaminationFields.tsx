import { CheckboxField, Field, TextareaField } from "./Fields.tsx";
import { useState } from "react";
import type { ImageExamination } from "../../contracts/presentation.ts";

interface ExaminationFieldsProps {
  initial: ImageExamination | null;
  locale: string;
}
const emptyExamination = { image: "", title: "Image", descriptions: [""], reverse: "" };

export function ExaminationFields({ initial, locale }: ExaminationFieldsProps) {
  const [enabled, setEnabled] = useState(Boolean(initial));
  const label = initial?.actionId
    ? locale.startsWith("fr")
      ? "Examiner la photographie"
      : "Examine the photograph"
    : locale.startsWith("fr")
      ? "Examiner l’image"
      : "Examine the image";
  const [draft, setDraft] = useState<ImageExamination>(() => ({
    ...emptyExamination,
    ...initial,
    buttonLabel: initial?.buttonLabel ?? label,
  }));
  return (
    <fieldset>
      <legend>Image examination</legend>
      <CheckboxField
        label="Media examinable"
        checked={enabled}
        onChange={(event) => setEnabled(event.target.checked)}
      />
      {enabled && (
        <>
          <input type="hidden" name="examination" value={JSON.stringify(draft)} />
          <Field
            label="Examine button label"
            maxLength={100}
            value={draft.buttonLabel ?? label}
            onChange={(event) => setDraft({ ...draft, buttonLabel: event.target.value })}
          />
          <Field
            label="Examination title"
            required
            maxLength={100}
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
          <TextareaField
            label="Image details (one per line)"
            value={draft.descriptions.join("\n")}
            onChange={(event) =>
              setDraft({ ...draft, descriptions: event.target.value.split("\n") })
            }
          />
          <TextareaField
            label="Text on the reverse (optional)"
            maxLength={5000}
            value={draft.reverse}
            onChange={(event) => setDraft({ ...draft, reverse: event.target.value })}
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
