import { Story } from "inkjs";
import { FrameSchema, ReaderFailure } from "../../contracts/story.ts";
import type { Frame, NarrativeEngine, StoryBundle } from "../../contracts/story.ts";

function tag(tags: string[], prefix: string, fallback?: string): string {
  const values = tags.filter((value) => value.startsWith(`${prefix}:`));
  if (!values.length && fallback !== undefined) return fallback;
  if (values.length !== 1) throw new ReaderFailure("content");
  return values[0]!.slice(prefix.length + 1).trim();
}

export class InkNarrativeEngine implements NarrativeEngine {
  private readonly story: Story;
  private readonly bundle: StoryBundle;

  constructor(
    bundle: StoryBundle,
    startKnot?: string,
    testVariables?: Record<string, string | number | boolean>,
  ) {
    this.bundle = bundle;
    try {
      this.story = new Story(JSON.stringify(bundle.ink));
      this.story.onError = () => {
        throw new ReaderFailure("content");
      };
      for (const [name, value] of Object.entries(testVariables ?? {})) {
        if (!this.story.variablesState.GlobalVariableExistsWithName(name))
          throw new Error(`Unknown Ink test variable: ${name}`);
        this.story.variablesState[name] = value;
      }
      if (startKnot) this.story.ChoosePathString(startKnot);
    } catch {
      throw new ReaderFailure("content");
    }
  }

  private choices(actions = false) {
    return this.story.currentChoices
      .filter((choice) => (choice.tags ?? []).includes("interaction") === actions)
      .map((choice) => ({
        id: tag(
          choice.tags ?? [],
          "choice",
          this.bundle.authored ? `option-${choice.index}` : undefined,
        ),
        text: choice.text,
      }));
  }
  private passageId(tags: string[], previous: string, path: string) {
    const fallback = this.bundle.authored
      ? path
          .split(".")[0]!
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/^[^a-z]+/, "") || "start"
      : "";
    const next = tag(tags, "passage", previous || fallback);
    if (previous && previous !== next && !this.bundle.authored) throw new ReaderFailure("content");
    return previous || next;
  }

  private validateFrame(frame: Frame): Frame {
    const allowed = this.bundle.passages[frame.passageId];
    if (
      (!this.bundle.authored &&
        (!allowed || frame.segments.some((segment) => !allowed.includes(segment.id)))) ||
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
      const path = this.story.state.currentPathString ?? "start";
      const text = this.continueLine()?.trim();
      if (!text) continue;
      const tags = this.story.currentTags ?? [];
      passageId = this.passageId(tags, passageId, path);
      const segmentId = tag(
        tags,
        "segment",
        this.bundle.authored ? `${passageId}.line-${steps}` : undefined,
      );
      segments.push({ id: segmentId, text });
    }
    const facts = Object.fromEntries(
      (this.bundle.variables ?? []).map((name) => [name, this.story.variablesState[name]]),
    );
    const parsed = FrameSchema.safeParse({
      passageId,
      segments,
      choices: this.choices(),
      ...(this.bundle.variables ? { facts, actions: this.choices(true) } : {}),
    });
    if (!parsed.success) throw new ReaderFailure("content");
    return this.validateFrame(parsed.data);
  }
  private continueLine() {
    if (!this.bundle.authored) return this.story.Continue();
    this.story.ContinueAsync(50);
    if (!this.story.asyncContinueComplete) throw new ReaderFailure("content");
    return this.story.currentText;
  }

  choose(choiceId: string): void {
    const index = this.story.currentChoices.findIndex(
      (choice) =>
        tag(
          choice.tags ?? [],
          "choice",
          this.bundle.authored ? `option-${choice.index}` : undefined,
        ) === choiceId,
    );
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
      if (
        frame &&
        (JSON.stringify(this.choices(true)) !== JSON.stringify(frame.actions ?? []) ||
          (this.bundle.variables ?? []).some(
            (name) => this.story.variablesState[name] !== frame.facts?.[name],
          ))
      ) {
        throw new Error("Saved facts or interactions disagree with Ink state");
      }
    } catch {
      throw new ReaderFailure("save-invalid");
    }
  }
}
