import { useEffect, useLayoutEffect, useRef } from "react";
import type { PresentationSession } from "../presentation/presentation-session.ts";
import type { Frame } from "../../contracts/story.ts";
import type { StoryBundle } from "../../contracts/story.ts";
import type { PresentationBlock } from "../../contracts/presentation.ts";
import { mediaIsVisible } from "../../contracts/presentation.ts";
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
  heading,
  children,
}: {
  frame: Frame;
  instant: boolean;
  disabled: boolean;
  onChoose: (id: string) => void;
  media: ReturnType<PresentationSession["getSnapshot"]>;
  bundle: StoryBundle;
  presentation: PresentationSession;
  heading: React.ReactNode;
  children: React.ReactNode;
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
  const reached = reachedBlocks(
    blocks,
    reveal.paragraphs,
    media.completedBlocks,
    instant || media.revealAll,
  );
  const illustration = (block: Extract<PresentationBlock, { kind: "media" }>) => (
    <ReaderIllustration
      key={block.id}
      {...{ block, bundle, frame, presentation, media, disabled, onChoose }}
    />
  );
  const finish = () => {
    reveal.finish();
    presentation.revealRemaining();
  };
  return (
    <div
      className="reader-scene"
      data-illustrated={blocks.some((block) => block.kind === "media" && block.layout === "right")}
    >
      <div className="reader-copy">
        {heading}
        <div className="narrative-blocks prose">
          {reached.map((block) => {
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
              return block.layout === "right" ? null : illustration(block);
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
        {children}
      </div>
      {blocks.some((block) => block.kind === "media" && block.layout === "right") && (
        <aside
          className="story-art"
          aria-label={bundle.locale === "fr" ? "Illustration de la page" : "Page illustration"}
        >
          {reached
            .filter(
              (block): block is Extract<PresentationBlock, { kind: "media" }> =>
                block.kind === "media" && block.layout === "right",
            )
            .map(illustration)}
        </aside>
      )}
    </div>
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
      className={`narrative-media media-${block.layout}${block.photograph ? " media-photograph" : ""}`}
      data-block={block.id}
      hidden={!mediaIsVisible(block, media)}
      style={{
        translate: block.position ? `${block.position.x}% ${block.position.y}%` : undefined,
        width: block.widthPercent ? `${block.widthPercent}%` : undefined,
        ...mediaAlignment[block.align ?? "left"],
      }}
    >
      <SceneIllustration
        bundle={bundle}
        passageId={frame.passageId}
        presentation={presentation}
        block={block}
      />
      {block.caption && <figcaption>{block.caption}</figcaption>}
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

const mediaAlignment = {
  left: { marginInlineEnd: "auto" },
  right: { marginInlineStart: "auto" },
  center: { marginInlineStart: "auto", marginInlineEnd: "auto" },
};
