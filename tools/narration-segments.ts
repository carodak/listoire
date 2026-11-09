import { createHash } from "node:crypto";
import type { Frame, StoryBundle } from "../src/contracts/story.ts";
import { InkNarrativeEngine } from "../src/features/story-runtime/ink-engine.ts";

export function narrationSegments(bundle: StoryBundle) {
  const engine = new InkNarrativeEngine(bundle);
  const initial = engine.advance();
  const queue = [{ state: engine.serialize(), frame: initial }];
  const visited = new Set<string>();
  const segments = new Map<
    string,
    { segmentId: string; passageId: string; locale: string; text: string; spokenTextDigest: string }
  >();
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const { state, frame } = queue[cursor]!;
    // shortcut: equivalent frames/globals are merged; revisit before visit-count-dependent loops.
    const signature = JSON.stringify(frame);
    if (visited.has(signature)) continue;
    if (visited.size >= 8192) throw new Error("Narration export exceeded the authored path budget");
    visited.add(signature);
    rememberSegments(segments, frame, bundle.locale);
    for (const choice of [...frame.choices, ...(frame.actions ?? [])]) {
      const action = bundle.game?.actions.find((action) => action.id === choice.gameAction);
      const results = gameResults(action?.kind);
      for (const result of results) {
        engine.restore(state, frame);
        if (result) engine.setGameFacts({ ...result, game_roll: 0 });
        engine.choose(choice.id);
        const next = engine.advance();
        queue.push({ state: engine.serialize(), frame: next });
      }
    }
  }
  return [...segments.values()];
}

function gameResults(kind: string | undefined) {
  if (kind === "combat")
    return [
      { game_success: true, game_outcome: 1 },
      { game_success: false, game_outcome: 2 },
      { game_success: false, game_outcome: 3 },
      { game_success: true, game_outcome: 4 },
    ];
  if (kind === "stat-check" || kind === "ability-check")
    return [
      { game_success: true, game_outcome: 0 },
      { game_success: false, game_outcome: 0 },
    ];
  return [kind ? { game_success: true, game_outcome: 0 } : undefined];
}

function rememberSegments(
  segments: Map<
    string,
    { segmentId: string; passageId: string; locale: string; text: string; spokenTextDigest: string }
  >,
  frame: Frame,
  locale: string,
) {
  for (const segment of frame.segments) {
    const text = segment.text.normalize("NFC");
    const digest = createHash("sha256").update(text).digest("hex");
    segments.set(`${segment.id}:${digest}`, {
      segmentId: segment.id,
      passageId: frame.passageId,
      locale: locale,
      text,
      spokenTextDigest: digest,
    });
  }
}
