import type { StoryProject } from "../../contracts/editor-project.ts";
import type { AceUndoManager, ProjectDelta } from "./ace.ts";

export class ProjectHistory {
  private readonly manager: AceUndoManager;
  private last: { label: string; at: number; delta: ProjectDelta } | undefined;
  constructor(manager: AceUndoManager, restore: (project: StoryProject) => void) {
    this.manager = manager;
    this.document = {
      undoChanges: (sets: ProjectDelta[]) => restore(JSON.parse(sets[0]!.deltas[0]!.lines[0]!)),
      redoChanges: (sets: ProjectDelta[]) => restore(JSON.parse(sets.at(-1)!.deltas[0]!.lines[1]!)),
    };
  }
  private readonly document;
  record(before: StoryProject, after: StoryProject, label: string, now = Date.now()) {
    if (this.last?.label === label && now - this.last.at < 750) {
      this.last.delta.deltas[0]!.lines[1] = JSON.stringify(after);
      this.last.at = now;
    } else {
      const delta = {
        group: "project",
        deltas: [{ lines: [JSON.stringify(before), JSON.stringify(after)] }],
      };
      this.manager.execute({ args: [[delta], this.document] });
      if (this.manager.$undoStack.length > 30) this.manager.$undoStack.shift();
      this.last = { label, at: now, delta };
    }
  }
  undo() {
    this.last = undefined;
    this.manager.undo();
  }
  redo() {
    this.last = undefined;
    this.manager.redo();
  }
  get canUndo() {
    return this.manager.hasUndo();
  }
  get canRedo() {
    return this.manager.hasRedo();
  }
}
