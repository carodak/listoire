type ShortcutEvent = Pick<
  KeyboardEvent,
  "key" | "ctrlKey" | "metaKey" | "shiftKey" | "preventDefault" | "stopPropagation" | "target"
>;
export type FormatCommand = "bold" | "italic" | "underline" | "strike" | "clear";
/** Ctrl/Cmd + key; strikethrough needs Shift (Ctrl+X alone stays Cut). */
const formats: Record<string, { command: FormatCommand; shift: boolean }> = {
  b: { command: "bold", shift: false },
  i: { command: "italic", shift: false },
  u: { command: "underline", shift: false },
  x: { command: "strike", shift: true },
  "\\": { command: "clear", shift: false },
};

export function editorShortcut(
  event: ShortcutEvent,
  actions: {
    undo: () => void;
    redo: () => void;
    save: () => Promise<unknown>;
    find?: (replace: boolean) => void;
    format?: (command: FormatCommand) => void;
  },
) {
  if (!(event.ctrlKey || event.metaKey)) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest?.("dialog")) return;
  const key = event.key.toLowerCase();
  const handled = () => {
    event.preventDefault();
    event.stopPropagation();
  };
  if (key === "s") {
    event.preventDefault();
    void actions.save();
    return;
  }
  if ((key === "f" || key === "h") && actions.find) {
    handled();
    actions.find(key === "h");
    return;
  }
  const format = formats[key];
  // Formatting only from the script or its toolbar: other fields keep their own keys.
  if (format && actions.format && format.shift === event.shiftKey) {
    if (!target?.closest?.(".editor-script, .text-toolbar")) return;
    handled();
    actions.format(format.command);
    return;
  }
  if (key !== "z" && key !== "y") return;
  handled();
  if (key === "y" || event.shiftKey) actions.redo();
  else actions.undo();
}
