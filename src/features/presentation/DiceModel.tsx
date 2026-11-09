import { useEffect, useRef, useState } from "react";
import { renderDie } from "./dice-renderer.ts";

export function DiceModel({
  sides,
  value,
  animate,
  onSettled,
}: {
  sides: 6 | 20;
  value: number;
  animate: boolean;
  onSettled: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let dispose: (() => void) | undefined;
    const timer = setTimeout(() => {
      try {
        dispose = renderDie(canvas.current!, sides, value, animate, onSettled);
      } catch {
        setUnavailable(true);
        onSettled();
      }
    }, 0);
    return () => {
      clearTimeout(timer);
      dispose?.();
    };
  }, [sides, value, animate, onSettled]);
  return (
    <div className="die-model" aria-hidden="true">
      <canvas ref={canvas} width="112" height="112" hidden={unavailable} />
      {unavailable && <span className="die-unavailable">{value}</span>}
    </div>
  );
}
