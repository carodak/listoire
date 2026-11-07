import { useState } from "react";
import { EditorDialog } from "./EditorDialog.tsx";
import { buildInkCommand, knotNames } from "./ink-commands.ts";
const nameLabels: Record<string, string> = {
  Knot: "Knot name",
  Stitch: "Stitch name",
  Variable: "Variable name",
  "Insert Variable": "Variable name",
};

interface CommandDialogProps {
  command: string;
  script: string;
  onInsert: (value: string, structural?: boolean) => void;
  onClose: () => void;
}

export function CommandDialog({ command, script, onInsert, onClose }: CommandDialogProps) {
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [condition, setCondition] = useState("");
  const [create, setCreate] = useState(false);
  const [error, setError] = useState("");
  const knots = knotNames(script);
  const choice = command.includes("Choice");
  const variable = command.includes("Variable");
  function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      onInsert(
        buildInkCommand(
          command,
          { name, label, condition, create },
          knots,
          `choice-${crypto.randomUUID()}`,
        ),
        true,
      );
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }
  return (
    <EditorDialog title={command} onClose={onClose}>
      <form onSubmit={submit}>
        <label>
          {nameLabels[command] ?? "Destination Knot or Stitch"}
          <input
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            list="ink-identifiers"
          />
        </label>
        <datalist id="ink-identifiers">
          {(variable ? [...script.matchAll(/^\s*VAR\s+(\w+)/gm)].map((m) => m[1]!) : knots).map(
            (k) => (
              <option key={k} value={k} />
            ),
          )}
        </datalist>
        {(choice || command === "Variable") && (
          <label>
            {choice ? "Choice label" : "Value"}
            <input value={label} onChange={(e) => setLabel(e.target.value)} required={choice} />
          </label>
        )}
        {choice && (
          <label>
            Optional condition
            <input value={condition} onChange={(e) => setCondition(e.target.value)} />
          </label>
        )}
        {!["Knot", "Stitch"].includes(command) && !variable && (
          <label className="check">
            <input type="checkbox" checked={create} onChange={(e) => setCreate(e.target.checked)} />
            Create destination Knot
          </label>
        )}
        {error && <p role="alert">{error}</p>}
        <p className="editor-hint">
          Structure commands are inserted in each translation. New text is explicitly marked for
          translation review.
        </p>
        <footer>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" type="submit">
            Insert {command}
          </button>
        </footer>
      </form>
    </EditorDialog>
  );
}
