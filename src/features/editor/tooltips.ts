import { useEffect } from "react";
export const commandHelp: Record<string, string> = {
  "3D Scene": "Compose a reusable 3D illustration and render it as an image or video for the book.",
  Knot: "A main section or passage in your story.",
  Stitch: "A smaller section inside a Knot.",
  Divert: "Send the story to another Knot or Stitch.",
  Tunnel: "Visit another section, then return to the calling section.",
  "Tunnel Return": "Return to the place that called the current Tunnel.",
  "Basic Choice": "A reader decision that can be chosen once.",
  "Sticky Choice": "A reader decision that remains available after it is chosen.",
  "Nested Choice": "A decision inside another decision.",
  Gather: "Bring branches back together at one point.",
  "End Story": "Finish this story path.",
  Comment: "Add an author note that readers will not see.",
  "Declare Variable": "Store a value that the story can remember.",
  "Set Variable": "Replace the value stored in a Variable.",
  "Modify Variable": "Increase, decrease or update a stored value.",
  LIST: "Declare a named set of values for narrative logic.",
  "Insert Variable": "Show a stored value in the story text.",
  "If / Else": "Choose between two passages of text using a condition.",
  "Conditional Choice": "Show a choice only when its condition is true.",
  "Inline Condition": "Choose text inside a sentence using a condition.",
  "Multi-line Condition": "Choose between larger blocks of content using a condition.",
  "Text Variation": "Vary the text shown across visits.",
  Function: "Define reusable Ink logic.",
  Thread: "Start a parallel narrative branch.",
  Image: "Choose an illustration and when and where it appears.",
  Animation: "Animate a scene, transition, image or text.",
  "Sound Effect": "Play a sound at a chosen moment.",
  "Background Music": "Play or stop a track across several sections.",
  TTS: "Choose narration voices, speech settings and recordings.",
  "Scene Properties": "Edit presentation settings for the current section.",
  "Edit Selected Media": "Reopen the properties of the media command at the cursor.",
  History: "Restore a saved version of the complete story project.",
  Compile: "Check Ink and media references in every language.",
  Issues: "Read compilation and configuration errors.",
  Save: "Save this project and update the reader when validation succeeds.",
  "Load / Import": "Open an Ink file or restore a complete project backup.",
  Export: "Download Ink source or a full project backup.",
  Settings: "Edit story metadata, languages and defaults.",
  Character: "Edit the character configuration.",
  Stats: "Inspect the character configuration used by the existing engine.",
  Ability: "Edit informational character abilities.",
};
export function useEditorTooltips(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const root = document.querySelector(".story-editor");
    if (!root) return;
    const apply = () => {
      root.querySelectorAll<HTMLButtonElement>("button:not([title])").forEach((button) => {
        const label = button.getAttribute("aria-label") ?? button.textContent?.trim() ?? "";
        button.title = commandHelp[label] ?? `${label} — open or apply this story editing action.`;
      });
      root
        .querySelectorAll<HTMLLabelElement>(
          "label:not([title]), legend:not([title]), summary:not([title])",
        )
        .forEach((label) => {
          const text = Array.from(label.childNodes)
            .filter((node) => node.nodeType === Node.TEXT_NODE)
            .map((node) => node.textContent)
            .join(" ")
            .trim();
          const field = label.querySelector<HTMLInputElement>("input, select, textarea");
          label.title =
            fieldHelp[field?.name ?? ""] ??
            fieldHelp[text] ??
            commandHelp[text] ??
            `Adjust ${text.toLowerCase() || field?.getAttribute("aria-label") || "this setting"}. Changes take effect when you apply this dialog.`;
        });
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [ready]);
}

const fieldHelp: Record<string, string> = {
  Scene:
    "The passage where this media appears. Moving the command in the script changes its text position.",
  asset:
    "Choose an existing licensed catalogue asset. Copies in a composition reference the same file.",
  volume: "Loudness of this sound, from zero (silent) to one (full volume).",
  fade: "Fade-in or crossfade duration, in milliseconds.",
  segment:
    "Stable text segment that triggers this media when narration or text starts reaching it.",
  delay: "Wait this many milliseconds after the selected trigger.",
  show: "Show immediately, at a text position, or after a delay.",
  trigger: "Start the sound or effect when the page, selected text, or target image is reached.",
  persistence:
    "Hide this illustration after this many milliseconds. Zero keeps it until the next page.",
  duration: "Length of the fullscreen cinematic or effect, in milliseconds.",
  width: "Percentage of the reading column occupied by the illustration.",
  align: "Align a smaller image inside the reading column.",
  fit: "Fit preserves the whole image; Cover fills the frame by cropping its edges.",
  alt: "Describe the meaningful image content for screen readers.",
  caption: "Optional text displayed below the illustration.",
  "Page blend":
    "Paper blends ink into the page with irregular edges. Soft adds atmospheric feathering. None preserves the original edges.",
  "Text wrapping":
    "Let nearby paragraphs flow beside the image. Transparent single images can use their actual alpha contour.",
  Frame: "Choose the proportions of the illustration frame before adjusting the crop.",
  "Layer depth": "Foreground moves most, middleground frames the subject, background moves least.",
  "Game Mode":
    "Narrative has no mechanics; RPG adds checks and inventory; With Combat also enables encounters.",
};
