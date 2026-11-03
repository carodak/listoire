export function playTypingSound() {
  const audio = new Audio(`${import.meta.env.BASE_URL}audio/keyboard-typing.mp3`);
  // Autoplay is optional; a rejected attempt must not interrupt the introduction.
  void audio.play().catch(() => {});
  return () => audio.pause();
}
