import { prefersReducedMotion, reducedMotionMedia } from "../../contracts/reduced-motion.ts";
import { useEffect, useState } from "react";
import { playTypingSound } from "./typing-sound.ts";

export function useWelcomeIntro(text: string) {
  const letters = Array.from(text);
  const [skipped, setSkipped] = useState(() => prefersReducedMotion() || document.hidden);
  const [count, setCount] = useState(0);
  const complete = skipped || count >= letters.length;

  useEffect(() => {
    if (complete) return;
    const stopSound = playTypingSound();
    const motion = matchMedia(reducedMotionMedia);
    const reduce = () => {
      if (motion.matches) setSkipped(true);
    };
    const hide = () => {
      if (document.hidden) setSkipped(true);
    };
    const started = performance.now();
    const deadline = window.setTimeout(() => setSkipped(true), 2200);
    let frame = 0;
    const tick = (now: number) => {
      const next = Math.min(letters.length, Math.floor(((now - started) / 2200) * letters.length));
      setCount(next);
      if (next < letters.length) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", hide);
    motion.addEventListener("change", reduce);
    return () => {
      clearTimeout(deadline);
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", hide);
      motion.removeEventListener("change", reduce);
      stopSound();
    };
  }, [complete, text, letters.length]);

  return {
    complete,
    visibleText: complete ? text : letters.slice(0, count).join(""),
  };
}
