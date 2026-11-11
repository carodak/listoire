import type { StoryBundle } from "../../contracts/story.ts";
import type { RibbonTab } from "./Ribbon.tsx";
export interface EditorView {
  locale: string;
  tab: RibbonTab;
  collapsed: boolean;
  dialog: string;
  selectedScene: string;
  selectedPath: string;
  selectedMedia?: string;
  /** `settled`: a live refresh, shown in its final state (no entrance, sound or voice). */
  preview: { bundle: StoryBundle; knot: string; key: string; settled?: boolean } | null;
  busy: boolean;
  leftWidth: number;
  previewWidth: number;
}
