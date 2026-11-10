type Point = [number, number];

/** Small seeded generator: a bolt's shape is decoration, never game state. */
function generator(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Midpoint displacement: each pass splits every segment and pushes its middle sideways. */
function jagged(from: Point, to: Point, passes: number, roughness: number, random: () => number) {
  let points = [from, to];
  let spread = roughness;
  for (let pass = 0; pass < passes; pass++) {
    const next: Point[] = [points[0]!];
    for (let index = 1; index < points.length; index++) {
      const [ax, ay] = points[index - 1]!;
      const [bx, by] = points[index]!;
      const length = Math.hypot(bx - ax, by - ay);
      const offset = (random() - 0.5) * length * spread;
      next.push(
        [
          (ax + bx) / 2 - ((by - ay) / length) * offset,
          (ay + by) / 2 + ((bx - ax) / length) * offset,
        ],
        [bx, by],
      );
    }
    points = next;
    spread *= 0.9; // stays jagged at every scale, like a real channel
  }
  return points;
}

const path = (points: Point[]) =>
  points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");

/** A main channel and 2–3 forks, in a 100×100 box, from top left towards bottom right. */
export function boltPaths(seed: number) {
  const random = generator(seed);
  const start: Point = [4 + random() * 22, 2 + random() * 10];
  const end: Point = [62 + random() * 30, 78 + random() * 18];
  const main = jagged(start, end, 6, 0.55, random);
  const forks = Array.from({ length: 2 + Math.floor(random() * 2) }, () => {
    const at = main[Math.floor(main.length * (0.25 + random() * 0.45))]!;
    const angle =
      Math.atan2(end[1] - at[1], end[0] - at[0]) +
      (random() < 0.5 ? -1 : 1) * (0.35 + random() * 0.5);
    const reach = 14 + random() * 22;
    return path(
      jagged(
        at,
        [at[0] + Math.cos(angle) * reach, at[1] + Math.sin(angle) * reach],
        4,
        0.5,
        random,
      ),
    );
  });
  return { main: path(main), forks, end };
}

const SVG = "http://www.w3.org/2000/svg";
let gradients = 0;

/**
 * A branching bolt over a soft light falloff where it lands. Layered strokes give the glow
 * (no blur filter, so it stays cheap full-screen); CSS animates the flicker and fade.
 */
export function lightningElement({
  seed = Date.now(),
  color = "#fff1c4",
  strength = 0.35,
}: { seed?: number; color?: string; strength?: number } = {}) {
  const { main, forks, end } = boltPaths(seed);
  const make = (name: string, attributes: Record<string, string>, parent?: Element) => {
    const element = document.createElementNS(SVG, name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    parent?.append(element);
    return element;
  };
  const svg = make("svg", {
    class: "lightning",
    viewBox: "0 0 100 100",
    preserveAspectRatio: "none",
    "aria-hidden": "true",
  });
  const id = `lightning-light-${++gradients}`;
  const gradient = make(
    "radialGradient",
    { id, cx: `${end[0]}%`, cy: `${end[1]}%`, r: "80%" },
    make("defs", {}, svg),
  );
  for (const [offset, opacity] of [
    [0, strength],
    [0.3, strength * 0.4],
    [1, 0],
  ] as const)
    make(
      "stop",
      { offset: String(offset), "stop-color": color, "stop-opacity": String(opacity) },
      gradient,
    );
  // An even wash lights the whole view; the falloff adds light where the bolt lands.
  make(
    "rect",
    {
      class: "lightning-wash",
      width: "100",
      height: "100",
      fill: color,
      opacity: String(strength / 2),
    },
    svg,
  );
  make("rect", { class: "lightning-light", width: "100", height: "100", fill: `url(#${id})` }, svg);
  for (const [kind, d] of [...forks.map((d) => ["fork", d] as const), ["main", main] as const])
    for (const layer of ["glow", "core"])
      make(
        "path",
        {
          class: `lightning-${layer} lightning-${kind}`,
          d,
          "vector-effect": "non-scaling-stroke",
        },
        svg,
      );
  return svg;
}
