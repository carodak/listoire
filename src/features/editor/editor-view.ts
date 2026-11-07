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
  preview: { bundle: StoryBundle; knot: string; key: string } | null;
  busy: boolean;
  leftWidth: number;
  previewWidth: number;
}
