import type { StoryProject } from "../../contracts/editor-project.ts";

interface Version {
  before: string;
  after: string;
  label: string;
  at: number;
}

export class ProjectHistory {
  private readonly versions: Version[] = [];
  private cursor = 0;
  private last: Version | undefined;
  record(before: StoryProject, after: StoryProject, label: string, now = Date.now()) {
    if (this.last?.label === label && now - this.last.at < 750) {
      this.last.after = JSON.stringify(after);
      this.last.at = now;
    } else {
      this.versions.splice(this.cursor);
      this.last = { before: JSON.stringify(before), after: JSON.stringify(after), label, at: now };
      this.versions.push(this.last);
      if (this.versions.length > 30) this.versions.shift();
      this.cursor = this.versions.length;
    }
  }
  undo(): StoryProject | undefined {
    this.last = undefined;
    if (this.canUndo) return JSON.parse(this.versions[--this.cursor]!.before);
  }
  redo(): StoryProject | undefined {
    this.last = undefined;
    if (this.canRedo) return JSON.parse(this.versions[this.cursor++]!.after);
  }
  get canUndo() {
    return this.cursor > 0;
  }
  get canRedo() {
    return this.cursor < this.versions.length;
  }
}
