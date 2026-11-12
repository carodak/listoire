import type { StoryProject } from "../../contracts/editor-project.ts";
import { narrationModes } from "../../contracts/story.ts";
import { SelectField } from "./Fields.tsx";
type Mode = StoryProject["languages"][string]["narrationMode"];
interface NarrationModeSelectProps {
  value: Mode;
  onChange: (mode: Mode) => void;
}

export function NarrationModeSelect({ value, onChange }: NarrationModeSelectProps) {
  return (
    <SelectField
      label="Narration mode"
      value={value}
      onChange={onChange}
      options={narrationModes}
      labels={{
        "ai-live": "AI Live — local Chatterbox",
        "ai-pregenerated": "AI Pre-generated",
        human: "Human Recording",
        disabled: "Disabled",
      }}
    />
  );
}
