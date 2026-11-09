import { Dialog } from "../../shared/Dialog.tsx";
import { CloseButton } from "../../shared/CloseButton.tsx";
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
  const content = (
    <>
      <header>
        <h2>{title}</h2>
        {actions}
        <CloseButton label="Close dialog" title="Close this dialog" onClick={onClose} />
      </header>
      {children}
    </>
  );
  return docked ? (
    <section className="editor-dialog editor-docked-media" role="region" aria-label={title}>
      {content}
    </section>
  ) : (
    <Dialog className="editor-dialog" aria-label={title} onDismiss={onClose}>
      {content}
    </Dialog>
  );
}

export function EditorFormActions({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <footer>
      <button type="button" onClick={onClose}>
        Cancel
      </button>
      <button className="primary" type="submit">
        {children}
      </button>
    </footer>
  );
}
