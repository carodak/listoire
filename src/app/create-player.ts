import type { StoryBundle } from "../contracts/story.ts";
import { StoryDirector } from "../features/story-runtime/director.ts";
import type { SaveManager } from "../persistence/save-manager.ts";

export async function createPlayer(
  bundle: StoryBundle,
  saves: SaveManager,
): Promise<StoryDirector> {
  const { InkNarrativeEngine } = await import("../features/story-runtime/ink-engine.ts");
  return new StoryDirector(bundle, new InkNarrativeEngine(bundle), {
    read: saves.read.bind(saves),
    commit: saves.commit.bind(saves),
  });
}
