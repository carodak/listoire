import { useEffect, useMemo, useRef, useState } from "react";
import type { Frame } from "../../contracts/story.ts";

export function useTextReveal(
  frame: Frame | null,
  instant: boolean,
  transport?: { paused: boolean; synchronized: boolean; progress: Record<string, number> },
) {
  const [count, setCount] = useState(0);
  const [finished, setFinished] = useState(instant);
  if (instant && !finished) setFinished(true);
  const elapsed = useRef(0);
  const [floor, setFloor] = useState(0);
  const segments = useMemo(
    () =>
      frame?.segments.map((segment) => ({
        ...segment,
        letters: Array.from(
          new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(segment.text),
          (part) => ({ text: part.segment, end: part.index + part.segment.length }),
        ),
      })) ?? [],
    [frame],
  );
  const total = segments.reduce((sum, segment) => sum + segment.letters.length, 0);
  const paused = transport?.paused ?? false;
  useEffect(() => {
    if (instant || paused) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const finish = () => setFinished(true);
    const reduce = () => {
      if (motion.matches) finish();
    };
    const hide = () => {
      if (document.hidden) finish();
    };
    if (motion.matches || document.hidden) finish();
    const start = performance.now() - elapsed.current;
    let timer = 0;
    const tick = () => {
      elapsed.current = performance.now() - start;
      const next = Math.floor(elapsed.current / 13);
      setCount(next);
      if (next < total) timer = window.setTimeout(tick, 32);
    };
    tick();
    motion.addEventListener("change", reduce);
    document.addEventListener("visibilitychange", hide);
    return () => {
      clearTimeout(timer);
      motion.removeEventListener("change", reduce);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [instant, paused, total]);
  const wanted = paused
    ? floor
    : transport?.synchronized
      ? segments.reduce(
          (sum, segment) =>
            sum +
            segment.letters.filter((letter) => letter.end <= (transport.progress[segment.id] ?? 0))
              .length,
          0,
        )
      : count;
  const visibleCount = Math.max(floor, wanted);
  if (visibleCount > floor) setFloor(visibleCount);
  const paragraphs = segments.map((segment, index) => {
    const start = segments.slice(0, index).reduce((sum, prior) => sum + prior.letters.length, 0);
    return {
      id: segment.id,
      text: segment.text,
      visible:
        instant || finished
          ? segment.text
          : segment.letters
              .slice(0, Math.max(0, visibleCount - start))
              .map((letter) => letter.text)
              .join(""),
    };
  });
  return {
    complete:
      instant || finished || paragraphs.every((paragraph) => paragraph.visible === paragraph.text),
    paragraphs,
    finish: () => setFinished(true),
  };
}
