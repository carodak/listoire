import { appPath } from "../../contracts/app-path.ts";
export function playTypingSound() {
  const audio = new Audio(appPath("audio/keyboard-typing.mp3"));
  // Autoplay is optional; a rejected attempt must not interrupt the introduction.
  void audio.play().catch(() => {});
  return () => audio.pause();
}
