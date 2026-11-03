import { useState } from "react";
import { EditorDialog } from "./EditorDialog.tsx";

export function JsonProperties({
  title,
  value,
  onApply,
  onClose,
  description,
}: {
  title: string;
  value: unknown;
  onApply: (value: unknown) => void;
  onClose: () => void;
  description?: string;
}) {
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
            setError(error instanceof Error ? error.message : String(error));
          }
        }}
      >
        <p>
          {description ??
            "Edit the existing runtime configuration. Changes are validated before applying."}
        </p>
        <label>
          Properties JSON
          <textarea
            className="properties-json"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <footer>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" type="submit">
            Apply properties
          </button>
        </footer>
      </form>
    </EditorDialog>
  );
}
