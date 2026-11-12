import { prefersReducedMotion, reducedMotionMedia } from "../../contracts/reduced-motion.ts";
import { useEffect, useId, useRef, useState } from "react";
import { runEffect } from "./effects.ts";

export function HandwrittenText({ text }: { text: string }) {
  const id = useId().replaceAll(":", "");
  const { root, ready } = useHandwritingReveal();
  const lines = wrapLines(text, 30);
  return (
    <div ref={root} className="photo-reverse" role="img" aria-label={text} data-writing={ready}>
      <svg
        viewBox={`0 0 600 ${lines.length * 75 + 30}`}
        aria-hidden="true"
        style={{ visibility: ready ? undefined : "hidden" }}
      >
        <defs>
          {lines.map((_, index) => (
            <mask
              key={index}
              id={`${id}-${index}`}
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="600"
              height={lines.length * 75 + 30}
            >
              <path
                d={`M0 ${index * 75 + 50} H600`}
                stroke="white"
                strokeWidth="80"
                strokeDasharray="600"
              />
            </mask>
          ))}
        </defs>
        {lines.map((line, index) => (
          <text
            key={index}
            x="300"
            y={index * 75 + 60}
            textAnchor="middle"
            fill="white"
            mask={`url(#${id}-${index})`}
          >
            {line}
          </text>
        ))}
      </svg>
    </div>
  );
}

function wrapLines(text: string, width: number) {
  const lines: string[] = [];
  for (const word of text.split(/\s+/)) {
    if (!lines.length || lines.at(-1)!.length + word.length > width) lines.push(word);
    else lines[lines.length - 1] += ` ${word}`;
  }
  return lines;
}

/** Fades the card in, then strokes each line's mask in turn. */
function useHandwritingReveal() {
  const root = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const scope = new AbortController();
    const reduce = matchMedia(reducedMotionMedia);
    const playback = runEffect(
      root.current!,
      { id: "fade-in", duration: 420 },
      scope.signal,
      reduce.matches,
    );
    void playback.then(() => {
      if (!scope.signal.aborted) setReady(true);
    });
    return () => scope.abort();
  }, []);
  useEffect(() => {
    if (!ready) return;
    const paths = root.current!.querySelectorAll<SVGPathElement>("mask path");
    if (prefersReducedMotion()) return;
    const animations = Array.from(paths, (path, index) =>
      path.animate([{ strokeDashoffset: 600 }, { strokeDashoffset: 0 }], {
        duration: 1400,
        delay: index * 1400,
        easing: "linear",
        fill: "both",
      }),
    );
    return () => animations.forEach((animation) => animation.cancel());
  }, [ready]);
  return { root, ready };
}
