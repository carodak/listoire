import { Story } from "inkjs";
import type { Frame, StoryBundle } from "../../contracts/story.ts";
import { ReaderFailure } from "../../contracts/story.ts";
import { inkChoices, validateInkFrame } from "./ink-frame.ts";
export function restoreInkCheckpoint(
  story: Story,
  bundle: StoryBundle,
  state: string,
  frame?: Frame,
): void {
  try {
    story.state.LoadJson(state);
    if (frame) validateInkFrame(bundle, frame);
    if (
      frame &&
      (story.canContinue ||
        JSON.stringify(inkChoices(story, bundle)) !== JSON.stringify(frame.choices))
    ) {
      throw new Error("Save is not at its evaluated boundary");
    }
    if (
      frame &&
      (JSON.stringify(inkChoices(story, bundle, true)) !== JSON.stringify(frame.actions ?? []) ||
        (bundle.variables ?? []).some((name) => story.variablesState[name] !== frame.facts?.[name]))
    ) {
      throw new Error("Saved facts or interactions disagree with Ink state");
    }
  } catch {
    throw new ReaderFailure("save-invalid");
  }
}

export function createInkStory(
  bundle: StoryBundle,
  startKnot?: string,
  testVariables?: Record<string, string | number | boolean>,
) {
  try {
    const story = new Story(JSON.stringify(bundle.ink));
    story.onError = () => {
      throw new ReaderFailure("content");
    };
    writeInkFacts(story, testVariables ?? {});
    if (startKnot) story.ChoosePathString(startKnot);
    return story;
  } catch {
    throw new ReaderFailure("content");
  }
}
export function writeInkFacts(story: Story, facts: Record<string, string | number | boolean>) {
  for (const [name, value] of Object.entries(facts)) {
    if (!story.variablesState.GlobalVariableExistsWithName(name))
      throw new ReaderFailure("content");
    story.variablesState[name] = value;
  }
}
