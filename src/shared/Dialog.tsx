import { useLayoutEffect, useRef } from "react";
import type { DialogHTMLAttributes } from "react";

/** Native focus trap, Escape/backdrop dismissal and focus restoration for every modal. */
export function Dialog({
  children,
  onDismiss = () => {},
  ...props
}: Pick<
  DialogHTMLAttributes<HTMLDialogElement>,
  "children" | "className" | "aria-label" | "aria-labelledby"
> & { onDismiss?: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const element = dialog.current!;
    const previous = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      {...props}
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onDismiss();
      }}
    >
      {children}
    </dialog>
  );
}
