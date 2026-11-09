import { useEffect, useRef } from "react";
import { lightningElement } from "./lightning.ts";

export function SpellFeedback({
  ability,
  instant = false,
}: {
  ability?: string;
  instant?: boolean;
}) {
  const node = useRef<HTMLSpanElement>(null);
  const show = Boolean(ability) && !instant;
  useEffect(() => {
    if (!show) return;
    const bolt = lightningElement();
    node.current?.append(bolt);
    return () => bolt.remove();
  }, [show]);
  if (!show) return null;
  return (
    <span
      ref={node}
      className="reader-viewport-feedback spell-learning-effect spell-cast-effect"
      aria-hidden="true"
    />
  );
}
