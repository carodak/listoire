import { useLayoutEffect } from "react";
import type { PresentationSession } from "../presentation/presentation-session.ts";

export function useModalPause(presentation?: PresentationSession) {
  useLayoutEffect(() => {
    if (!presentation) return;
    const wasPaused = presentation.getSnapshot().paused;
    presentation.pause();
    return () => {
      if (!wasPaused) presentation.resume();
    };
  }, [presentation]);
}
