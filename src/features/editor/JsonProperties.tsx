import { useState } from "react";
import { message } from "../../contracts/error-message.ts";
import { EditorDialog, EditorFormActions } from "./EditorDialog.tsx";
import { TextareaField } from "./Fields.tsx";

interface JsonPropertiesProps {
  title: string;
  value: unknown;
  onApply: (value: unknown) => void;
  onClose: () => void;
  description?: string;
}

export function JsonProperties({
  title,
  value,
  onApply,
  onClose,
  description,
}: JsonPropertiesProps) {
  const [text, setText] = useState(JSON.stringify(value, null, 2));
  const [error, setError] = useState("");
  return (
    <EditorDialog title={title} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            onApply(JSON.parse(text));
            onClose();
          } catch (error) {
            setError(message(error));
          }
        }}
      >
        <p>
          {description ??
            "Edit the existing runtime configuration. Changes are validated before applying."}
        </p>
        <TextareaField
          label="Properties JSON"
          className="properties-json"
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
        />
        {error && <p role="alert">{error}</p>}
        <EditorFormActions onClose={onClose}>Apply properties</EditorFormActions>
      </form>
    </EditorDialog>
  );
}
