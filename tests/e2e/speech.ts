import type { Page } from "@playwright/test";

type Spoken = { text: string; onboundary?: (event: unknown) => void }[];

/** A device voice that records each utterance (and holds one spoken while paused). */
export async function fakeSpeech(page: Page) {
  await page.addInitScript(() => {
    class Utterance {
      constructor(public text: string) {}
    }
    let paused = false;
    let pending: Utterance | undefined;
    const spoken: Utterance[] = [];
    const synth = Object.assign(new EventTarget(), {
      getVoices: () => [{ voiceURI: "test", lang: "en-US", name: "Test voice" }],
      pause: () => {
        paused = true;
      },
      resume: () => {
        paused = false;
        if (pending) spoken.push(pending);
        pending = undefined;
      },
      cancel: () => {
        pending = undefined;
      },
      speak: (value: Utterance) => {
        if (!paused) spoken.push(value);
        else pending = value;
      },
    });
    Object.defineProperty(window, "speechSynthesis", { value: synth });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: Utterance });
    Object.assign(window, { spoken });
  });
}

/** The last utterance reaches a word, as a speaking voice reports it. */
export const speakBoundary = (page: Page, charIndex: number, charLength: number) =>
  page.evaluate(
    ([charIndex, charLength]) =>
      (window as unknown as { spoken: Spoken }).spoken
        .at(-1)!
        .onboundary?.({ charIndex, charLength }),
    [charIndex, charLength] as const,
  );
