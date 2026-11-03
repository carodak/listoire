import type { StoryBundle } from "../contracts/story.ts";
import { StoryDirector } from "../features/story-runtime/director.ts";
import type { SaveManager } from "../persistence/save-manager.ts";
import { createCharacter } from "../features/character/create-character.ts";
import { PresentationSession } from "../features/presentation/presentation-session.ts";
import type { ReadingPreferences } from "../contracts/presentation.ts";
import type { z } from "zod";
import { PreviewStateSchema } from "../contracts/editor-project.ts";

export async function createPlayer(
  bundle: StoryBundle,
  saves: SaveManager,
  preferences: ReadingPreferences,
  preview?: { startKnot?: string; state?: z.infer<typeof PreviewStateSchema> },
) {
  const { InkNarrativeEngine } = await import("../features/story-runtime/ink-engine.ts");
  const presentation = new PresentationSession(bundle, preferences);
  const director = new StoryDirector(
    bundle,
    new InkNarrativeEngine(bundle, preview?.startKnot, preview?.state?.variables),
    {
      read: saves.read.bind(saves),
      commit: saves.commit.bind(saves),
    },
    bundle.character
      ? () =>
          preview?.state?.character ??
          createCharacter(
            bundle.character!.abilities.map((ability) => ability.id),
            () => {
              const value = new Uint8Array(1);
              do {
                crypto.getRandomValues(value);
              } while (value[0]! >= 252);
              return (value[0]! % 6) + 1;
            },
          )
      : undefined,
    presentation,
  );
  return { director, presentation };
}
