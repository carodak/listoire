import type { PresentationBlock } from "../../contracts/presentation.ts";
import type { Frame, StoryBundle } from "../../contracts/story.ts";

export function presentationBlocks(bundle: StoryBundle, frame: Frame): PresentationBlock[] {
  const blocks = bundle.scenes?.[frame.passageId]?.blocks ?? [
    ...frame.segments.map((s) => ({ kind: "text" as const, segmentId: s.id })),
    { kind: "choices" as const },
  ];
  if (!bundle.authored) return blocks;
  const ordered: PresentationBlock[] = [];
  let cursor = 0;
  for (const block of blocks) {
    if (block.kind === "text") {
      const index = frame.segments.findIndex((s) => s.id === block.segmentId);
      if (index >= cursor) {
        ordered.push(
          ...frame.segments
            .slice(cursor, index + 1)
            .map((s) => ({ kind: "text" as const, segmentId: s.id })),
        );
        cursor = index + 1;
      }
    } else {
      if (block.kind === "choices")
        ordered.push(
          ...frame.segments.slice(cursor).map((s) => ({ kind: "text" as const, segmentId: s.id })),
        );
      ordered.push(block);
    }
  }
  return ordered;
}

export function reachedBlocks(
  blocks: PresentationBlock[],
  paragraphs: { id: string; text: string; visible: string }[],
  completed: string[],
  instant: boolean,
) {
  const reached: PresentationBlock[] = [];
  for (const block of blocks) {
    if (block.kind === "text") {
      const paragraph = paragraphs.find((paragraph) => paragraph.id === block.segmentId);
      if (!paragraph) continue;
      reached.push(block);
      if (paragraph.text !== paragraph.visible) break;
    } else {
      reached.push(block);
      if (
        block.kind === "media" &&
        block.layout === "fullscreen" &&
        !instant &&
        !completed.includes(block.id)
      )
        break;
    }
  }
  return reached;
}
