let context: AudioContext | undefined;

/**
 * Call from a click or key press: browsers let a page make sound only after a user gesture,
 * and a context created or resumed inside one starts running. Never throws.
 */
export function unlockAudio() {
  try {
    context ??= new AudioContext();
    void context.resume().catch(() => {});
  } catch {
    // No Web Audio, or the browser refused: story audio stays optional.
  }
}
