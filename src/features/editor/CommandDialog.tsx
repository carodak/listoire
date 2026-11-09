import { useState } from "react";
import { EditorDialog, EditorFormActions } from "./EditorDialog.tsx";
import { buildInkCommand } from "./ink-commands.ts";
import { knotNames } from "./ink-outline.ts";
import { CheckboxField, Field } from "./Fields.tsx";
const nameLabels: Record<string, string> = {
  Knot: "Knot name",
  Stitch: "Stitch name",
  Variable: "Variable name",
  "Insert Variable": "Variable name",
};

const commandInput = (data: FormData) => ({
  name: String(data.get("name") ?? ""),
  label: String(data.get("label") ?? ""),
  condition: String(data.get("condition") ?? ""),
  create: data.has("create"),
});

interface CommandDialogProps {
  command: string;
  script: string;
  onInsert: (value: string, structural?: boolean) => void;
  onClose: () => void;
}

export function CommandDialog({ command, script, onInsert, onClose }: CommandDialogProps) {
  const [error, setError] = useState("");
  const knots = knotNames(script);
  const choice = command.includes("Choice");
  const variable = command.includes("Variable");
  const identifiers = variable
    ? [...script.matchAll(/^\s*VAR\s+(\w+)/gm)].map((m) => m[1]!)
    : knots;
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const id = `choice-${crypto.randomUUID()}`;
      onInsert(buildInkCommand(command, commandInput(data), knots, id), true);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }
  return (
    <EditorDialog title={command} onClose={onClose}>
      <form onSubmit={submit}>
        <Field
          label={nameLabels[command] ?? "Destination Knot or Stitch"}
          autoFocus
          required
          name="name"
          list="ink-identifiers"
        />
        <datalist id="ink-identifiers">
          {identifiers.map((k) => (
            <option key={k} value={k} />
          ))}
        </datalist>
        {(choice || command === "Variable") && (
          <Field label={choice ? "Choice label" : "Value"} name="label" required={choice} />
        )}
        {choice && <Field label="Optional condition" name="condition" />}
        {!["Knot", "Stitch"].includes(command) && !variable && (
          <CheckboxField label="Create destination Knot" name="create" />
        )}
        {error && <p role="alert">{error}</p>}
        <p className="editor-hint">
          Structure commands are inserted in each translation. New text is explicitly marked for
          translation review.
        </p>
        <EditorFormActions onClose={onClose}>Insert {command}</EditorFormActions>
      </form>
    </EditorDialog>
  );
}
