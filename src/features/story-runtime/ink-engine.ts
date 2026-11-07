import { createInkStory, writeInkFacts, restoreInkCheckpoint } from "./ink-checkpoint.ts";
import { chooseInk, readInkFrame } from "./ink-frame.ts";
import type { Story } from "inkjs";
import type { Frame, NarrativeEngine, StoryBundle } from "../../contracts/story.ts";

export class InkNarrativeEngine implements NarrativeEngine {
  private readonly story: Story;
  private readonly bundle: StoryBundle;

  constructor(
    bundle: StoryBundle,
    startKnot?: string,
    testVariables?: Record<string, string | number | boolean>,
  ) {
    this.bundle = bundle;
    this.story = createInkStory(bundle, startKnot, testVariables);
  }

  advance(): Frame {
    return readInkFrame(this.story, this.bundle);
  }
  choose(choiceId: string): void {
    chooseInk(this.story, this.bundle, choiceId);
  }

  setGameFacts(facts: Record<string, string | number | boolean>): void {
    writeInkFacts(this.story, facts);
  }
  serialize(): string {
    return this.story.state.ToJson();
  }

  restore(state: string, frame?: Frame): void {
    restoreInkCheckpoint(this.story, this.bundle, state, frame);
  }
}
