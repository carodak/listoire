import { useSyncExternalStore } from "react";
import { useEffect, useLayoutEffect, useRef } from "react";
import type { PresentationSession } from "../presentation/presentation-session.ts";
import type { Frame } from "../../contracts/story.ts";
import type { StoryBundle } from "../../contracts/story.ts";
import type { PresentationBlock } from "../../contracts/presentation.ts";
import { mediaIsVisible, isMediaBlock } from "../../contracts/presentation.ts";
import { SceneIllustration } from "../presentation/SceneIllustration.tsx";
import { PhotographExamination } from "./PhotographViewer.tsx";
import { isFullscreenMedia } from "../../contracts/presentation.ts";

import { useTextReveal } from "./use-text-reveal.ts";
import { ChoiceList } from "./ChoiceList.tsx";
import { ReaderMediaFigure } from "./ReaderMediaFigure.tsx";
import { TypographicText } from "../presentation/TypographicText.tsx";
import type { CheckOption } from "../../contracts/game.ts";

type MediaBlock = Extract<PresentationBlock, { kind: "media" }>;

interface PassageTextProps {
  frame: Frame;
  instant: boolean;
  disabled: boolean;
  onChoose: (id: string) => void;
  resumeCombat?: () => void;
  checkOptions?: Record<string, CheckOption>;
  media: ReturnType<PresentationSession["getSnapshot"]>;
  bundle: StoryBundle;
  presentation: PresentationSession;
  heading: React.ReactNode;
  children: React.ReactNode;
}

export function PassageText(props: PassageTextProps) {
  const { frame, media, bundle, presentation, disabled, onChoose } = props;
  const notice = bundle.scenes?.[frame.passageId]?.notice;
  const progress = useSyncExternalStore(presentation.subscribeProgress, presentation.getProgress);
  const reveal = useTextReveal(frame, props.instant || media.revealAll, {
    ...media,
    progress,
    paused: media.paused || media.blocking || media.exiting,
  });
  const blocks = presentationBlocks(bundle, frame);
  const reached = reachedBlocks(blocks, reveal.paragraphs, media.completedBlocks, media.skipMedia);
  const illustration = (block: MediaBlock) => (
    <ReaderIllustration
      key={block.id}
      {...{ block, bundle, frame, presentation, media, disabled, onChoose }}
    />
  );
  const layout = bookMediaLayout(bundle, blocks, reached, media);
  const choices =
    reveal.complete && !media.blocking ? (
      <ChoiceList
        key="choices"
        resumeCombat={props.resumeCombat}
        checkOptions={props.checkOptions}
        bundle={bundle}
        frame={frame}
        locale={bundle.locale}
        disabled={disabled}
        onChoose={onChoose}
      />
    ) : null;
  return (
    <div className="reader-scene" data-illustrated={layout.illustrated}>
      <div className="reader-copy" data-passage={frame.passageId}>
        {props.heading}
        <NarrativeBlocks
          blocks={reached}
          paragraphs={reveal.paragraphs}
          presentation={presentation}
          onFinish={() => {
            reveal.finish();
            presentation.revealRemaining();
          }}
          illustration={illustration}
          choices={choices}
        />
        {reveal.complete && notice && <p className="story-notice">{notice}</p>}
        {props.children}
      </div>
      <ReaderArtwork layout={layout} locale={bundle.locale} illustration={illustration} />
    </div>
  );
}

function NarrativeBlocks({
  blocks,
  paragraphs,
  presentation,
  onFinish,
  illustration,
  choices,
}: {
  blocks: PresentationBlock[];
  paragraphs: NonNullable<NarrativeParagraphProps["segment"]>[];
  presentation: PresentationSession;
  onFinish: () => void;
  illustration: (block: MediaBlock) => React.ReactNode;
  choices: React.ReactNode;
}) {
  return (
    <div className="narrative-blocks prose">
      {blocks.map((block) => {
        if (block.kind === "text")
          return (
            <NarrativeParagraph
              key={block.segmentId}
              onClick={onFinish}
              presentation={presentation}
              segment={paragraphs.find((segment) => segment.id === block.segmentId)}
            />
          );
        if (block.kind === "media") return block.layout === "right" ? null : illustration(block);
        return choices;
      })}
    </div>
  );
}

function ReaderArtwork({
  layout,
  locale,
  illustration,
}: {
  layout: ReturnType<typeof bookMediaLayout>;
  locale: string;
  illustration: (block: MediaBlock) => React.ReactNode;
}) {
  if (!layout.illustrated) return null;
  return (
    <aside
      className="story-art"
      aria-label={locale === "fr" ? "Illustration de la page" : "Page illustration"}
    >
      {layout.right && illustration(layout.right)}
    </aside>
  );
}

interface NarrativeParagraphProps {
  presentation: PresentationSession;
  segment: (Frame["segments"][number] & { visible: string }) | undefined;
  onClick: () => void;
}

function NarrativeParagraph({ presentation, segment, onClick }: NarrativeParagraphProps) {
  const node = useRef<HTMLParagraphElement>(null);
  const announced = useRef(false);
  const segmentId = segment?.id;
  useLayoutEffect(() => {
    if (!node.current || !segmentId) return;
    presentation.segmentReached(segmentId);
    return presentation.bind({ canvas: node.current, image: node.current }, segmentId);
  }, [presentation, segmentId]);
  useEffect(() => {
    if (segment && segment.text === segment.visible && !announced.current) {
      announced.current = true;
      presentation.segmentRevealed(segment.id);
    }
  }, [segment, presentation]);
  if (!segment) return null;
  return (
    <p ref={node} onClick={onClick} data-segment={segment.id} data-align={segment.align}>
      <span className="sr-only">{segment.text}</span>
      <span aria-hidden="true">
        <TypographicText
          text={segment.text}
          typography={segment.typography}
          visible={segment.visible.length}
          reserve={Boolean(segment.align)}
        />
      </span>
    </p>
  );
}

interface ReaderIllustrationProps {
  block: MediaBlock;
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
        {block.layout !== "background" && examine}
        {block.caption && <figcaption>{block.caption}</figcaption>}
      </ReaderMediaFigure>
      {block.layout === "background" && examine}
    </>
  );
}

export function reachedBlocks(
  blocks: PresentationBlock[],
  paragraphs: { id: string; text: string; visible: string }[],
  completed: string[],
  skipMedia: boolean,
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
      if (isFullscreenMedia(block) && !skipMedia && !completed.includes(block.id)) break;
    }
  }
  return reached;
}

function anchorMedia(blocks: PresentationBlock[], anchors: NonNullable<Frame["mediaAnchors"]>) {
  const media = new Map(blocks.filter(isMediaBlock).map((block) => [block.id, block]));
  const previous = new Map<string, PresentationBlock>();
  for (const { id, after = "" } of anchors) {
    const block = media.get(id);
    if (!block) continue;
    blocks.splice(blocks.indexOf(block), 1);
    const previousIndex = blocks.indexOf(previous.get(after) ?? block);
    const position =
      previousIndex >= 0
        ? previousIndex
        : blocks.findIndex((block) => block.kind === "text" && block.segmentId === after);
    blocks.splice(position + 1, 0, block);
    previous.set(after, block);
  }
  return blocks;
}

export function bookMediaLayout(
  bundle: StoryBundle,
  blocks: PresentationBlock[],
  reached: PresentationBlock[],
  media: { visibleMedia: string[]; expiredMedia: string[]; revealAll: boolean },
) {
  const pictures = blocks.filter(isMediaBlock);
  const scenes = new Map(bundle.assets?.map((asset) => [asset.id, asset.scene3d]));
  const appeared = new Set([...media.visibleMedia, ...media.expiredMedia]);
  const wide = pictures.some(
    (block) =>
      block.layout === "wide" && (Boolean(block.illustration) || Boolean(scenes.get(block.image))),
  );
  const right = reached
    .filter(isMediaBlock)
    .filter(
      (block) =>
        block.layout === "right" && (!block.show || media.revealAll || appeared.has(block.id)),
    )
    .at(-1);
  const illustrated = !wide && pictures.some((block) => block.layout === "right");
  return { wide, right, illustrated };
}

export function presentationBlocks(bundle: StoryBundle, frame: Frame): PresentationBlock[] {
  const text = frame.segments.map((s) => ({ kind: "text" as const, segmentId: s.id }));
  const blocks = bundle.scenes?.[frame.passageId]?.blocks ?? [
    ...text,
    { kind: "choices" as const },
  ];
  if (!bundle.authored) return blocks;
  const ordered: PresentationBlock[] = [];
  let cursor = 0;
  for (const block of blocks) {
    if (block.kind === "text") {
      const index = frame.segments.findIndex((s) => s.id === block.segmentId);
      ordered.push(...text.slice(cursor, index + 1));
      cursor = Math.max(cursor, index + 1);
    } else {
      if (block.kind === "choices") ordered.push(...text.slice(cursor));
      ordered.push(block);
    }
  }
  return anchorMedia(ordered, frame.mediaAnchors ?? []);
}
