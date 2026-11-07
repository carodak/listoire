import type { NarrationClip } from "../../contracts/media.ts";

export function narrationCharacters(clip: NarrationClip, length: number, seconds: number) {
  const time = Number.isFinite(seconds) ? Math.max(0, seconds * 1000) : 0;
  const anchors = [
    { startMs: 0, character: 0 },
    ...clip.marks,
    { startMs: clip.durationMs, character: length },
  ];
  let index = 0;
  while (index + 1 < anchors.length && anchors[index + 1]!.startMs <= time) index++;
  const from = anchors[index]!,
    to = anchors[index + 1];
  if (!to) return length;
  const fraction = Math.min(1, (time - from.startMs) / Math.max(1, to.startMs - from.startMs));
  return Math.min(length, Math.floor(from.character + (to.character - from.character) * fraction));
}
