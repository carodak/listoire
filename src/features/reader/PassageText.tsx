import { useEffect, useRef } from "react";
import type { PresentationSession } from "../presentation/presentation-session.ts";
import { useTranslation } from "react-i18next";
import type { Frame, Locale } from "../../contracts/story.ts";
import { useTextReveal } from "./use-text-reveal.ts";
import { ChoiceList } from "./ChoiceList.tsx";

export function PassageText({
  frame,
  locale,
  instant,
  disabled,
  notice,
  onChoose,
  media,
  onSegmentRevealed,
}: {
  frame: Frame;
  locale: Locale;
  instant: boolean;
  disabled: boolean;
  notice: string | undefined;
  onChoose: (id: string) => void;
  media: ReturnType<PresentationSession["getSnapshot"]>;
  onSegmentRevealed: (id: string) => void;
}) {
  const { t } = useTranslation();
  const reveal = useTextReveal(frame, instant || media.revealAll, media);
  const announced = useRef(new Set<string>());
  useEffect(() => {
    for (const paragraph of reveal.paragraphs) {
      if (paragraph.text === paragraph.visible && !announced.current.has(paragraph.id)) {
        announced.current.add(paragraph.id);
        onSegmentRevealed(paragraph.id);
      }
    }
  }, [reveal.paragraphs, onSegmentRevealed]);
  return (
    <>
      <div className="prose" onClick={reveal.finish}>
        {reveal.paragraphs.map((segment) => (
          <p key={segment.id}>
            <span className="sr-only">{segment.text}</span>
            <span aria-hidden="true">{segment.visible}</span>
          </p>
        ))}
      </div>
      {!reveal.complete && (
        <button className="reveal-all" onClick={reveal.finish}>
          {t("revealAll")}
        </button>
      )}
      {reveal.complete && notice && <p className="story-notice">{notice}</p>}
      {reveal.complete && <ChoiceList
        frame={frame}
        locale={locale}
        disabled={disabled}
        onChoose={onChoose}
      />}
    </>
  );
}
