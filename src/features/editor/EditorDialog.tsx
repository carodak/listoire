import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

export function EditorDialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const focused = document.activeElement as HTMLElement | null;
    dialog.current!.showModal();
    return () => {
      focused?.focus();
    };
  }, []);
  return (
    <dialog className="editor-dialog" ref={dialog} aria-label={title} onCancel={onClose}>
      <header>
        <h2>{title}</h2>
        <button type="button" title="Close this dialog" aria-label="Close dialog" onClick={onClose}>
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
