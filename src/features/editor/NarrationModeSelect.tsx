import type { StoryProject } from "../../contracts/editor-project.ts";
type Mode = StoryProject["languages"][string]["narrationMode"];
interface NarrationModeSelectProps {
  value: Mode;
  onChange: (mode: Mode) => void;
}

export function NarrationModeSelect({ value, onChange }: NarrationModeSelectProps) {
  return (
    <label>
      Narration mode
      <select
        aria-label="Narration mode"
        value={value}
        onChange={(event) => onChange(event.target.value as Mode)}
      >
        <option value="ai-live">AI Live — local Chatterbox</option>
        <option value="ai-pregenerated">AI Pre-generated</option>
        <option value="human">Human Recording</option>
        <option value="disabled">Disabled</option>
      </select>
    </label>
  );
}
