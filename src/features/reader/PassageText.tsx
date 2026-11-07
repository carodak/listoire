import { useEffect, useLayoutEffect, useRef } from "react";
import type { PresentationSession } from "../presentation/presentation-session.ts";
import type { Frame } from "../../contracts/story.ts";
import type { StoryBundle } from "../../contracts/story.ts";
import type { PresentationBlock } from "../../contracts/presentation.ts";
import { mediaIsVisible } from "../../contracts/presentation.ts";
import { SceneIllustration } from "../presentation/SceneIllustration.tsx";
import { PhotographExamination } from "./PhotographViewer.tsx";
import { reachedBlocks, presentationBlocks, bookMediaLayout } from "./narrative-blocks.ts";
import { useTextReveal } from "./use-text-reveal.ts";
import { ChoiceList } from "./ChoiceList.tsx";
import { ReaderMediaFigure } from "./ReaderMediaFigure.tsx";

interface PassageTextProps {
  frame: Frame;
  instant: boolean;
  disabled: boolean;
  onChoose: (id: string) => void;
  media: ReturnType<PresentationSession["getSnapshot"]>;
  bundle: StoryBundle;
  presentation: PresentationSession;
  heading: React.ReactNode;
  children: React.ReactNode;
}

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
}: PassageTextProps) {
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
  const layout = bookMediaLayout(bundle, blocks, reached, media);
  const finish = () => {
    reveal.finish();
    presentation.revealRemaining();
  };
  return (
    <div className="reader-scene" data-illustrated={layout.illustrated}>
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
      {layout.illustrated && (
        <aside
          className="story-art"
          aria-label={bundle.locale === "fr" ? "Illustration de la page" : "Page illustration"}
        >
          {layout.right && illustration(layout.right)}
        </aside>
      )}
    </div>
  );
}

interface NarrativeParagraphProps {
  presentation: PresentationSession;
  segment: { id: string };
  onClick: () => void;
  children: React.ReactNode;
}

function NarrativeParagraph({ presentation, segment, onClick, children }: NarrativeParagraphProps) {
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

interface ReaderIllustrationProps {
  block: Extract<PresentationBlock, { kind: "media" }>;
  bundle: StoryBundle;
  frame: Frame;
  presentation: PresentationSession;
  media: ReturnType<PresentationSession["getSnapshot"]>;
  disabled: boolean;
  onChoose: (id: string) => void;
}

function ReaderIllustration({
  block,
  bundle,
  frame,
  presentation,
  media,
  disabled,
  onChoose,
}: ReaderIllustrationProps) {
  if (block.layout === "fullscreen" && media.completedBlocks.includes(block.id)) return null;
  const examination = block.examination ?? (block.photograph ? bundle.examination : undefined);
  const examine =
    examination && mediaIsVisible(block, media) ? (
      <PhotographExamination
        presentation={presentation}
        bundle={bundle}
        frame={frame}
        enabled
        disabled={disabled}
        onDiscover={onChoose}
        examination={examination}
      />
    ) : null;
  return (
    <>
      <ReaderMediaFigure
        block={block}
        bundle={bundle}
        presentation={presentation}
        examinable={Boolean(examination)}
        hidden={!mediaIsVisible(block, media)}
      >
        <SceneIllustration
          bundle={bundle}
          passageId={frame.passageId}
          presentation={presentation}
          block={block}
        />
        {block.caption && <figcaption>{block.caption}</figcaption>}
        {block.layout !== "background" && examine}
      </ReaderMediaFigure>
      {block.layout === "background" && examine}
    </>
  );
}
