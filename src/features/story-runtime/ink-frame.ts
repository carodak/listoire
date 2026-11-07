import { FrameSchema, ReaderFailure } from "../../contracts/story.ts";
import type { Story } from "inkjs";
import type { Frame, StoryBundle } from "../../contracts/story.ts";
function tag(tags: string[], prefix: string, fallback?: string): string {
  const values = tags.filter((value) => value.startsWith(`${prefix}:`));
  if (!values.length && fallback !== undefined) return fallback;
  if (values.length !== 1) throw new ReaderFailure("content");
  return values[0]!.slice(prefix.length + 1).trim();
}

export function chooseInk(story: Story, bundle: StoryBundle, choiceId: string) {
  const index = story.currentChoices.findIndex(
    (choice) => inkChoiceId(choice, bundle) === choiceId,
  );
  if (index < 0) throw new ReaderFailure("content");
  story.ChooseChoiceIndex(index);
}
function inkChoiceId(choice: Story["currentChoices"][number], bundle: StoryBundle) {
  return tag(choice.tags ?? [], "choice", bundle.authored ? `option-${choice.index}` : undefined);
}
export function inkChoices(story: Story, bundle: StoryBundle, actions = false) {
  return story.currentChoices
    .filter((choice) => (choice.tags ?? []).includes("interaction") === actions)
    .map((choice) => ({
      id: inkChoiceId(choice, bundle),
      text: choice.text,
      ...((choice.tags ?? []).some((value) => value.startsWith("game:"))
        ? { gameAction: tag(choice.tags ?? [], "game") }
        : {}),
    }));
}
function inkPassage(bundle: StoryBundle, tags: string[], previous: string, path: string) {
  const fallback = bundle.authored
    ? path
        .split(".")[0]!
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/^[^a-z]+/, "") || "start"
    : "";
  const next = tag(tags, "passage", previous || fallback);
  if (previous && previous !== next && !bundle.authored) throw new ReaderFailure("content");
  return previous || next;
}

export function validateInkFrame(bundle: StoryBundle, frame: Frame): Frame {
  const allowed = bundle.passages[frame.passageId];
  if (
    (!bundle.authored &&
      (!allowed || frame.segments.some((segment) => !allowed.includes(segment.id)))) ||
    new Set(frame.segments.map((segment) => segment.id)).size !== frame.segments.length ||
    new Set(frame.choices.map((choice) => choice.id)).size !== frame.choices.length
  ) {
    throw new ReaderFailure("content");
  }
  return frame;
}

export function readInkFrame(story: Story, bundle: StoryBundle): Frame {
  const segments: Frame["segments"] = [];
  const mediaAnchors: NonNullable<Frame["mediaAnchors"]> = [];
  let passageId = "";
  let steps = 0;
  while (story.canContinue) {
    if (++steps > 200) throw new ReaderFailure("content");
    const path = story.state.currentPathString ?? "start";
    const text = continueInkLine(story, bundle.authored ?? false)?.trim();
    const tags = story.currentTags ?? [];
    for (const marker of tags.filter((value) => value.startsWith("media:")))
      mediaAnchors.push({ id: marker.slice(6).trim(), after: segments.at(-1)?.id });
    if (!text) continue;
    passageId = inkPassage(bundle, tags, passageId, path);
    const segmentId = tag(
      tags,
      "segment",
      bundle.authored ? `${passageId}.line-${steps}` : undefined,
    );
    segments.push({ id: segmentId, text });
  }
  const facts = Object.fromEntries(
    (bundle.variables ?? []).map((name) => [name, story.variablesState[name]]),
  );
  const parsed = FrameSchema.safeParse({
    passageId,
    segments,
    choices: inkChoices(story, bundle),
    ...(mediaAnchors.length ? { mediaAnchors } : {}),
    ...(bundle.variables ? { facts, actions: inkChoices(story, bundle, true) } : {}),
  });
  if (!parsed.success) throw new ReaderFailure("content");
  return validateInkFrame(bundle, parsed.data);
}
function continueInkLine(story: Story, authored: boolean) {
  if (!authored) return story.Continue();
  story.ContinueAsync(50);
  if (!story.asyncContinueComplete) throw new ReaderFailure("content");
  return story.currentText;
}
