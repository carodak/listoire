import { useEffect, useLayoutEffect, useRef } from "react";
import type { PresentationSession } from "../presentation/presentation-session.ts";
import type { Frame } from "../../contracts/story.ts";
import type { StoryBundle } from "../../contracts/story.ts";
import type { PresentationBlock } from "../../contracts/presentation.ts";
import { SceneIllustration } from "../presentation/SceneIllustration.tsx";
import { PhotographExamination } from "./PhotographViewer.tsx";
import { reachedBlocks, presentationBlocks } from "./narrative-blocks.ts";
import { useTextReveal } from "./use-text-reveal.ts";
import { ChoiceList } from "./ChoiceList.tsx";

export function PassageText({
  frame,
  instant,
  disabled,
  onChoose,
  media,
  bundle,
  presentation,
}: {
  frame: Frame;
  instant: boolean;
  disabled: boolean;
  onChoose: (id: string) => void;
  media: ReturnType<PresentationSession["getSnapshot"]>;
  bundle: StoryBundle;
  presentation: PresentationSession;
}) {
  const notice = bundle.scenes?.[frame.passageId]?.notice;
  const reveal = useTextReveal(frame, instant || media.revealAll, {
    ...media,
    paused: media.paused || media.blocking || media.exiting,
  });
  const announced = useRef(new Set<string>());
  useEffect(() => {
    for (const paragraph of reveal.paragraphs) {
      if (paragraph.text === paragraph.visible && !announced.current.has(paragraph.id)) {
        announced.current.add(paragraph.id);
        presentation.segmentRevealed(paragraph.id);
      }
    }
  }, [reveal.paragraphs, presentation]);
  const blocks = presentationBlocks(bundle, frame);
  const finish = () => {
    reveal.finish();
    presentation.revealRemaining();
  };
  return (
    <>
      <div className="narrative-blocks prose">
        {reachedBlocks(
          blocks,
          reveal.paragraphs,
          media.completedBlocks,
          instant || media.revealAll,
        ).map((block) => {
          if (block.kind === "text") {
            const segment = reveal.paragraphs.find((segment) => segment.id === block.segmentId);
            if (!segment) return null;
            return (
              <NarrativeParagraph
                key={segment.id}
                onClick={finish}
                presentation={presentation}
                segment={segment}
              >
                <span className="sr-only">{segment.text}</span>
                <span aria-hidden="true">{segment.visible}</span>
              </NarrativeParagraph>
            );
          }
          if (block.kind === "media")
            return (
              <ReaderIllustration
                key={block.id}
                block={block}
                bundle={bundle}
                frame={frame}
                presentation={presentation}
                media={media}
                disabled={disabled}
                onChoose={onChoose}
              />
            );
          return reveal.complete && !media.blocking ? (
            <ChoiceList
              key="choices"
              frame={frame}
              locale={bundle.locale}
              disabled={disabled}
              onChoose={onChoose}
            />
          ) : null;
        })}
      </div>
      {reveal.complete && notice && <p className="story-notice">{notice}</p>}
    </>
  );
}

function NarrativeParagraph({
  presentation,
  segment,
  onClick,
  children,
}: {
  presentation: PresentationSession;
  segment: { id: string };
  onClick: () => void;
  children: React.ReactNode;
}) {
  const node = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    if (!node.current) return;
    presentation.segmentReached(segment.id);
    return presentation.bind({ canvas: node.current, image: node.current }, segment.id);
  }, [presentation, segment.id]);
  return (
    <p ref={node} onClick={onClick}>
      {children}
    </p>
  );
}

function ReaderIllustration({
  block,
  bundle,
  frame,
  presentation,
  media,
  disabled,
  onChoose,
}: {
  block: Extract<PresentationBlock, { kind: "media" }>;
  bundle: StoryBundle;
  frame: Frame;
  presentation: PresentationSession;
  media: ReturnType<PresentationSession["getSnapshot"]>;
  disabled: boolean;
  onChoose: (id: string) => void;
}) {
  return (
    <figure
      className={`narrative-media media-${block.layout}`}
      data-block={block.id}
      hidden={
        media.expiredMedia.includes(block.id) ||
        (Boolean(block.show) && !media.visibleMedia.includes(block.id) && !media.revealAll)
      }
      style={{
        width: block.widthPercent ? `${block.widthPercent}%` : undefined,
        marginInlineStart: block.align === "right" || block.align === "center" ? "auto" : undefined,
        marginInlineEnd: block.align === "left" || block.align === "center" ? "auto" : undefined,
      }}
    >
      <SceneIllustration
        bundle={bundle}
        passageId={frame.passageId}
        presentation={presentation}
        block={block}
      />
      {block.photograph && (
        <PhotographExamination
          bundle={bundle}
          frame={frame}
          enabled
          disabled={disabled}
          onDiscover={onChoose}
        />
      )}
    </figure>
  );
}
