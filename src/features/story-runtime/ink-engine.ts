import { Story } from "inkjs";
import { FrameSchema, ReaderFailure } from "../../contracts/story.ts";
import type { Frame, NarrativeEngine, StoryBundle } from "../../contracts/story.ts";

function tag(tags: string[], prefix: string): string {
  const values = tags.filter((value) => value.startsWith(`${prefix}:`));
  if (values.length !== 1) throw new ReaderFailure("content");
  return values[0]!.slice(prefix.length + 1).trim();
}

export class InkNarrativeEngine implements NarrativeEngine {
  private readonly story: Story;
  private readonly bundle: StoryBundle;

  constructor(bundle: StoryBundle) {
    this.bundle = bundle;
    try {
      this.story = new Story(JSON.stringify(bundle.ink));
      this.story.onError = () => {
        throw new ReaderFailure("content");
      };
    } catch {
      throw new ReaderFailure("content");
    }
  }

  private choices() {
    return this.story.currentChoices.map((choice) => ({
      id: tag(choice.tags ?? [], "choice"),
      text: choice.text,
    }));
  }

  private validateFrame(frame: Frame): Frame {
    const allowed = this.bundle.passages[frame.passageId];
    if (
      !allowed ||
      frame.segments.some((segment) => !allowed.includes(segment.id)) ||
      new Set(frame.segments.map((segment) => segment.id)).size !== frame.segments.length ||
      new Set(frame.choices.map((choice) => choice.id)).size !== frame.choices.length
    ) {
      throw new ReaderFailure("content");
    }
    return frame;
  }

  advance(): Frame {
    const segments: Frame["segments"] = [];
    let passageId = "";
    let steps = 0;
    while (this.story.canContinue) {
      if (++steps > 200) throw new ReaderFailure("content");
      const text = this.story.Continue()?.trim();
      if (!text) continue;
      const tags = this.story.currentTags ?? [];
      if (tags.some((value) => value.startsWith("passage:"))) {
        const nextPassage = tag(tags, "passage");
        if (passageId && passageId !== nextPassage) throw new ReaderFailure("content");
        passageId = nextPassage;
      }
      segments.push({ id: tag(tags, "segment"), text });
    }
    const parsed = FrameSchema.safeParse({ passageId, segments, choices: this.choices() });
    if (!parsed.success) throw new ReaderFailure("content");
    return this.validateFrame(parsed.data);
  }

  choose(choiceId: string): void {
    const index = this.choices().findIndex((choice) => choice.id === choiceId);
    if (index < 0) throw new ReaderFailure("content");
    this.story.ChooseChoiceIndex(index);
  }

  serialize(): string {
    return this.story.state.ToJson();
  }

  restore(state: string, frame?: Frame): void {
    try {
      this.story.state.LoadJson(state);
      if (frame) this.validateFrame(frame);
      if (
        frame &&
        (this.story.canContinue || JSON.stringify(this.choices()) !== JSON.stringify(frame.choices))
      ) {
        throw new Error("Save is not at its evaluated boundary");
      }
    } catch {
      throw new ReaderFailure("save-invalid");
    }
  }
}
