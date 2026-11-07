import { SaveSchema, ReaderFailure } from "./story.ts";
import type { StoryBundle } from "./story.ts";
import { validateGameState } from "./game-validation.ts";

export function validateCheckpoint(bundle: StoryBundle, raw: unknown) {
  const result = SaveSchema.safeParse(raw);
  if (!result.success) throw new ReaderFailure("save-invalid");
  const save = result.data;
  if (
    save.storyId !== bundle.storyId ||
    save.mode !== bundle.mode ||
    save.locale !== bundle.locale ||
    save.release !== bundle.release ||
    save.inkDigest !== bundle.inkDigest ||
    save.inkjsVersion !== bundle.inkjsVersion
  ) {
    throw new ReaderFailure("save-incompatible");
  }
  if (save.game && save.character && bundle.game) {
    try {
      validateGameState(save.game, save.character, bundle.game, save.frame);
    } catch {
      throw new ReaderFailure("save-invalid");
    }
  }
  return save;
}
