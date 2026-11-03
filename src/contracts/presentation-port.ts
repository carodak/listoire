import type { Frame } from "./story.ts";
export interface NarrativePresentationPort {
  start(frame: Frame, occurrenceId: string, restored: boolean): void;
  leave?(): Promise<void>;
  cancel(): void;
  dispose(): void;
}
