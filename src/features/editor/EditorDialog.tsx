import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface EditorDialogProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  docked?: boolean;
  actions?: ReactNode;
}

export function EditorDialog({
  title,
  children,
  onClose,
  docked = false,
  actions,
}: EditorDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const focused = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => {
      focused?.focus();
    };
  }, []);
  const content = (
    <>
      <header>
        <h2>{title}</h2>
        {actions}
        <button type="button" title="Close this dialog" aria-label="Close dialog" onClick={onClose}>
          ×
        </button>
      </header>
      {children}
    </>
  );
  return docked ? (
    <section className="editor-dialog editor-docked-media" role="region" aria-label={title}>
      {content}
    </section>
  ) : (
    <dialog className="editor-dialog" ref={dialog} aria-label={title} onCancel={onClose}>
      {content}
    </dialog>
  );
}
