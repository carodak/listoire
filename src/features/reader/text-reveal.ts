export function advanceReveal(cursor: number, elapsedMs: number, limit: number, narrated = false) {
  const rate = narrated ? Math.max(18, Math.min(38, (limit - cursor) * 4)) : 1000 / 13;
  return Math.max(cursor, Math.min(limit, cursor + (Math.min(64, elapsedMs) * rate) / 1000));
}

export function narrationLead(
  segments: { id: string; text: string; letters: { end: number }[] }[],
  progress: Record<string, number>,
) {
  const text = segments.map((segment) => segment.text).join("\n");
  let cursor = 0;
  for (const segment of segments) {
    const spoken = Math.min(segment.text.length, progress[segment.id] ?? 0);
    cursor += spoken;
    if (spoken < segment.text.length) break;
    cursor++;
  }
  const words = [...text.matchAll(/\S+/gu)];
  const index = words.findIndex((word) => word.index + word[0].length >= cursor);
  const current = words[index];
  const next = words[index + 1];
  if (current && next) {
    const fraction = Math.max(0, (cursor - current.index) / current[0].length);
    cursor =
      fraction === 0 ? current.index + current[0].length : next.index + fraction * next[0].length;
  } else cursor = text.length;
  let offset = 0;
  let count = 0;
  for (const segment of segments) {
    count += segment.letters.filter((letter) => offset + letter.end <= cursor).length;
    offset += segment.text.length + 1;
  }
  return count;
}
import type { Frame } from "../../contracts/story.ts";

type LetterSegment = Frame["segments"][number] & { letters: { text: string; end: number }[] };
export function revealParagraphs(
  segments: LetterSegment[],
  visibleCount: number,
  complete: boolean,
) {
  let start = 0;
  return segments.map(({ letters, ...segment }) => {
    const offset = start;
    start += letters.length;
    return {
      ...segment,
      visible: complete
        ? segment.text
        : letters
            .slice(0, Math.max(0, visibleCount - offset))
            .map((letter) => letter.text)
            .join(""),
    };
  });
}
