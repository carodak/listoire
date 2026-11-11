import { reducedMotionMedia } from "../../contracts/reduced-motion.ts";
import { narrationLead, advanceReveal, revealParagraphs } from "./text-reveal.ts";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
import type { Frame } from "../../contracts/story.ts";

export function useTextReveal(
  frame: Frame,
  instant: boolean,
  transport?: {
    paused: boolean;
    synchronized: boolean;
    progress: Record<string, number>;
    voice?: string;
  },
) {
  const [finished, setFinished] = useState(instant);
  if (instant && !finished) setFinished(true);
  const segments = useMemo(
    () =>
      frame.segments.map((segment) => ({
        ...segment,
        letters: Array.from(
          new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(segment.text),
          (part) => ({ text: part.segment, end: part.index + part.segment.length }),
        ),
      })),
    [frame],
  );
  const total = segments.reduce((sum, segment) => sum + segment.letters.length, 0);
  const paused = transport?.paused ?? false;
  const narrated = transport?.voice === "playing" || transport?.voice === "paused";
  const finish = useCallback(() => setFinished(true), []);
  const limit =
    transport && (transport.synchronized || narrated)
      ? narrationLead(segments, transport.progress)
      : total;
  const visibleCount = useRevealClock(
    instant,
    paused,
    total,
    finish,
    limit,
    Boolean(transport?.synchronized || narrated),
  );
  const paragraphs = revealParagraphs(segments, visibleCount, instant || finished);
  return {
    complete:
      instant || finished || paragraphs.every((paragraph) => paragraph.visible === paragraph.text),
    paragraphs,
    finish,
  };
}

function useRevealClock(
  instant: boolean,
  paused: boolean,
  total: number,
  finish: () => void,
  limit: number,
  narrated: boolean,
) {
  const cursor = useRef(0);
  const target = useRef(limit);
  useLayoutEffect(() => {
    target.current = limit;
  }, [limit]);
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (instant || paused) return;
    const motion = matchMedia(reducedMotionMedia);
    const reduce = () => {
      if (motion.matches) finish();
    };
    const hide = () => {
      if (document.hidden) finish();
    };
    if (motion.matches || document.hidden) finish();
    let previous = performance.now();
    let timer = 0;
    const tick = (now: number) => {
      cursor.current = advanceReveal(cursor.current, now - previous, target.current, narrated);
      previous = now;
      const next = Math.floor(cursor.current);
      setCount(next);
      if (next < total) timer = requestAnimationFrame(tick);
    };
    timer = requestAnimationFrame(tick);
    motion.addEventListener("change", reduce);
    document.addEventListener("visibilitychange", hide);
    return () => {
      cancelAnimationFrame(timer);
      motion.removeEventListener("change", reduce);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [instant, paused, total, finish, narrated]);
  return count;
}
