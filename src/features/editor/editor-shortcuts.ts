type ShortcutEvent = Pick<
  KeyboardEvent,
  "key" | "ctrlKey" | "metaKey" | "shiftKey" | "preventDefault" | "stopPropagation" | "target"
>;
export function editorShortcut(
  event: ShortcutEvent,
  actions: { undo: () => void; redo: () => void; save: () => Promise<void> },
) {
  if (!(event.ctrlKey || event.metaKey)) return;
  if ((event.target as HTMLElement | null)?.closest?.("dialog")) return;
  const key = event.key.toLowerCase();
  if (key === "s") {
    event.preventDefault();
    void actions.save();
    return;
  }
  if (key !== "z" && key !== "y") return;
  event.preventDefault();
  event.stopPropagation();
  if (key === "y" || event.shiftKey) actions.redo();
  else actions.undo();
}
