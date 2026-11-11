import { SaveSchema, ReaderFailure } from "./story.ts";
import type { SavedPage, StoryBundle } from "./story.ts";
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
    // An earlier compatible version still has to restore exactly at its saved page (Ink check).
    (save.inkDigest !== bundle.inkDigest &&
      !bundle.compatibleInkDigests?.includes(save.inkDigest)) ||
    save.inkjsVersion !== bundle.inkjsVersion
  ) {
    throw new ReaderFailure("save-incompatible");
  }
  if (!validPage(bundle, save)) throw new ReaderFailure("save-invalid");
  // Back restores these pages exactly: only with this very Ink, and only valid ones. Without
  // them the save still loads, simply without Back.
  if (
    save.history &&
    (save.inkDigest !== bundle.inkDigest || !save.history.every((page) => validPage(bundle, page)))
  )
    delete save.history;
  return save;
}

function validPage(bundle: StoryBundle, page: SavedPage) {
  if (!page.game || !page.character || !bundle.game) return true;
  try {
    validateGameState(page.game, page.character, bundle.game, page.frame);
    return true;
  } catch {
    return false;
  }
}
