import { useEffect } from "react";
export const commandHelp: Record<string, string> = {
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
    const apply = () =>
      root.querySelectorAll<HTMLButtonElement>("button:not([title])").forEach((button) => {
        const label = button.getAttribute("aria-label") ?? button.textContent?.trim() ?? "";
        button.title = commandHelp[label] ?? `${label} — open or apply this story editing action.`;
      });
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [ready]);
}
