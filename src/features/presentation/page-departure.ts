/** Animate copies so cancellation never leaves React's text nodes altered. */
export async function dissolveWords(
  page: HTMLElement,
  signal: AbortSignal,
  instant: boolean,
  direction: "forward" | "back",
) {
  if (instant || signal.aborted) return;
  const overlay = document.createElement("div");
  overlay.className = "page-word-departure";
  overlay.setAttribute("aria-hidden", "true");
  const top =
    page.closest(".reader")?.querySelector(".reader-toolbar")?.getBoundingClientRect().bottom ?? 0;
  overlay.style.clipPath = `inset(${Math.max(0, top)}px 0 0 0)`;
  document.body.append(overlay);
  const hidden: HTMLElement[] = [];
  const animations: Animation[] = [];
  const cleanup = () => {
    animations.forEach((animation) => animation.cancel());
    hidden.forEach((element) => element.style.removeProperty("visibility"));
    overlay.remove();
  };
  signal.addEventListener("abort", cleanup, { once: true });
  try {
    let index = 0;
    for (const text of page.querySelectorAll<HTMLElement>(
      ".story-heading-copy h1, .prose p > span[aria-hidden=true]",
    )) {
      animations.push(...animateParagraph(text, overlay, index, direction));
      index = animations.length;
      hidden.push(text);
      text.style.visibility = "hidden";
    }
    for (const image of page.querySelectorAll<HTMLElement>(".narrative-media, .scene-heading-rule"))
      animations.push(
        image.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 920,
          easing: "ease-in-out",
          fill: "forwards",
        }),
      );
    await Promise.allSettled(animations.map((animation) => animation.finished));
  } finally {
    signal.removeEventListener("abort", cleanup);
    cleanup();
  }
}

function animateParagraph(
  text: HTMLElement,
  overlay: HTMLElement,
  start: number,
  direction: "forward" | "back",
) {
  const animations: Animation[] = [];
  const walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const style = getComputedStyle(node.parentElement!);
    if (style.visibility === "hidden") continue;
    animations.push(...animateLetters(node, text, overlay, start + animations.length, direction));
  }
  return animations;
}

function animateLetters(
  node: Node,
  text: HTMLElement,
  overlay: HTMLElement,
  start: number,
  direction: "forward" | "back",
) {
  const animations: Animation[] = [];
  let index = start;
  const style = getComputedStyle(node.parentElement!);
  for (const part of new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
    node.textContent!,
  )) {
    if (!part.segment.trim()) continue;
    const range = document.createRange();
    range.setStart(node, part.index);
    range.setEnd(node, part.index + part.segment.length);
    const rect = range.getBoundingClientRect();
    if (text.tagName !== "H1" && (rect.bottom < 0 || rect.top > innerHeight)) continue;
    const word = document.createElement("span");
    if (text.tagName === "H1") word.dataset.departureHeading = "true";
    word.textContent = part.segment;
    Object.assign(word.style, {
      position: "fixed",
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      font: style.font,
      color: style.color,
      webkitTextFillColor: style.webkitTextFillColor,
      webkitTextStroke: style.webkitTextStroke,
      lineHeight: `${rect.height}px`,
    });
    overlay.append(word);
    animations.push(
      word.animate(
        [
          { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
          {
            opacity: 0,
            transform: `translateY(${direction === "forward" ? -22 : 22}px)`,
            filter: "blur(3px)",
          },
        ],
        { duration: 920, delay: Math.min(index++ * 2, 220), easing: "ease-in", fill: "both" },
      ),
    );
  }
  return animations;
}
