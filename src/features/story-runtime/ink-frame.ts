import { FrameSchema, passageSlug, ReaderFailure } from "../../contracts/story.ts";
import { parseTypography } from "../../contracts/typography.ts";
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
      ...parseTypography(choice.text),
      ...((choice.tags ?? []).some((value) => value.startsWith("game:"))
        ? { gameAction: tag(choice.tags ?? [], "game") }
        : {}),
    }));
}
function inkPassage(bundle: StoryBundle, tags: string[], previous: string, path: string) {
  const fallback = bundle.authored ? passageSlug(path.split(".")[0]!) : "";
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

type Segment = Frame["segments"][number];

/**
 * An untagged authored line is named from its text (and its repeat count on the page), so
 * editing other lines keeps its ID, and the narration or cues attached to it.
 */
function lineId(passageId: string, text: string, seen: Map<string, number>) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++)
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193);
  const id = `${passageId}.line-${(hash >>> 0).toString(36)}`;
  const count = (seen.get(id) ?? 0) + 1;
  seen.set(id, count);
  return count > 1 ? `${id}-${count}` : id;
}

export function readInkFrame(story: Story, bundle: StoryBundle): Frame {
  const segments: Frame["segments"] = [];
  const mediaAnchors: NonNullable<Frame["mediaAnchors"]> = [];
  let passageId = "";
  let steps = 0;
  const lines = new Map<string, number>();
  while (story.canContinue) {
    if (++steps > 200) throw new ReaderFailure("content");
    const path = story.state.currentPathString ?? "start";
    const text = continueInkLine(story, bundle.authored ?? false)?.trim();
    const tags = story.currentTags ?? [];
    mediaAnchors.push(
      ...tags
        .filter((value) => value.startsWith("media:"))
        .map((marker) => ({ id: marker.slice(6).trim(), after: segments.at(-1)?.id })),
    );
    if (!text) continue;
    passageId = inkPassage(bundle, tags, passageId, path);
    const segmentId = tag(
      tags,
      "segment",
      bundle.authored ? lineId(passageId, text, lines) : undefined,
    );
    const align = tag(tags, "align", "left");
    segments.push({
      id: segmentId,
      ...parseTypography(text),
      // FrameSchema below rejects any other value as a content error.
      ...(align === "left" ? {} : { align: align as NonNullable<Segment["align"]> }),
    });
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
  // ContinueAsync runs one time slice; a slow device or a cold start needs several for a
  // line. 20 slices (1 s) still stops an authored loop that never ends a line.
  let slices = 0;
  do story.ContinueAsync(50);
  while (!story.asyncContinueComplete && ++slices < 20);
  if (!story.asyncContinueComplete) throw new ReaderFailure("content");
  return story.currentText;
}
