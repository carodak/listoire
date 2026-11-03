import snippets from "./vendor/snippets.json";
import { commandHelp } from "./tooltips.ts";

export type RibbonTab = "Story" | "Logic" | "Media" | "Game" | "Review";
interface Command {
  label: string;
  icon: string;
  action: string;
  snippet?: string;
}
const groups: Record<RibbonTab, { label: string; commands: Command[] }[]> = {
  Story: [
    {
      label: "Structure",
      commands: [
        { label: "Knot", icon: "§", action: "Knot" },
        { label: "Stitch", icon: "¶", action: "Stitch" },
        { label: "Divert", icon: "↗", action: "Divert" },
        { label: "Tunnel", icon: "⇢", action: "Tunnel" },
        { label: "Tunnel Return", icon: "↶", action: "insert", snippet: "->->\n" },
      ],
    },
    {
      label: "Choices",
      commands: [
        { label: "Basic Choice", icon: "⑂", action: "Choice" },
        { label: "Sticky Choice", icon: "+", action: "Sticky Choice" },
        { label: "Nested Choice", icon: "⋮", action: "Nested Choice" },
        { label: "Gather", icon: "↧", action: "insert", snippet: "- \n" },
      ],
    },
    {
      label: "Other",
      commands: [
        { label: "End Story", icon: "■", action: "upstream", snippet: "Ending indicator" },
        { label: "Comment", icon: "▤", action: "upstream", snippet: "Single-line comment" },
      ],
    },
  ],
  Logic: [
    {
      label: "Variables",
      commands: [
        { label: "Declare Variable", icon: "x", action: "upstream", snippet: "Global variable" },
        { label: "Set Variable", icon: "=", action: "Variable" },
        { label: "Modify Variable", icon: "±", action: "upstream", snippet: "Modify variable" },
        { label: "LIST", icon: "☷", action: "insert", snippet: "LIST inventory = key, letter\n" },
        { label: "Insert Variable", icon: "{x}", action: "Insert Variable" },
      ],
    },
    {
      label: "Conditions",
      commands: [
        {
          label: "If / Else",
          icon: "?",
          action: "upstream",
          snippet: "Multi-line logic/Condition",
        },
        { label: "Conditional Choice", icon: "⑂", action: "Conditional Choice" },
        {
          label: "Inline Condition",
          icon: "{?}",
          action: "upstream",
          snippet: "Inline logic/Condition",
        },
        {
          label: "Multi-line Condition",
          icon: "☰",
          action: "upstream",
          snippet: "Multi-line logic/Condition",
        },
        {
          label: "Text Variation",
          icon: "↔",
          action: "insert",
          snippet: "{~First variation|Second variation|Third variation}",
        },
      ],
    },
    {
      label: "Advanced",
      commands: [
        {
          label: "Function",
          icon: "ƒ",
          action: "insert",
          snippet: "=== function example(value) ===\n~ return value\n",
        },
        { label: "Thread", icon: "⇉", action: "Thread" },
      ],
    },
  ],
  Media: [
    {
      label: "Visuals",
      commands: [
        { label: "Image", icon: "▧", action: "Image" },
        { label: "Video", icon: "▷", action: "Video" },
        { label: "Animation", icon: "✧", action: "Animation" },
      ],
    },
    {
      label: "Audio",
      commands: [
        { label: "Sound Effect", icon: "♪", action: "Sound Effect" },
        { label: "Background Music", icon: "♫", action: "Background Music" },
      ],
    },
    { label: "Narration", commands: [{ label: "TTS", icon: "◖", action: "TTS" }] },
    {
      label: "Properties",
      commands: [
        { label: "Edit Selected Media", icon: "⚙", action: "Edit Selected Media" },
        { label: "Scene Properties", icon: "▤", action: "Scene Properties" },
      ],
    },
  ],
  Game: [
    {
      label: "Character",
      commands: [
        { label: "Character", icon: "♙", action: "Character" },
        { label: "Stats", icon: "≡", action: "Stats" },
        { label: "Ability", icon: "✦", action: "Ability" },
        ...["Item", "Equipment", "Inventory"].map((label) => ({
          label,
          icon: "◇",
          action: "unavailable",
        })),
      ],
    },
    {
      label: "Actions",
      commands: ["Stat Check", "Ability Check", "HP", "XP", "Game Condition"].map((label) => ({
        label,
        icon: "⚄",
        action: "unavailable",
      })),
    },
  ],
  Review: [
    { label: "Editing", commands: [{ label: "History", icon: "◷", action: "History" }] },
    {
      label: "Validation",
      commands: [
        { label: "Compile", icon: "✓", action: "Compile" },
        { label: "Issues", icon: "!", action: "Issues" },
      ],
    },
  ],
};

function upstreamSnippet(name: string) {
  for (const category of snippets)
    for (const snippet of category.snippets ?? [])
      if (snippet.name === name || `${category.categoryName}/${snippet.name}` === name)
        return snippet.ink!;
  throw new Error(`Unknown Inky Web command: ${name}`);
}

function AdditionalCommands({ insert }: { insert: (script: string) => void }) {
  return (
    <details className="additional-commands">
      <summary title="Browse all Ink examples and commands, grouped by purpose.">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24">
          <path d="M5 6h14M8 13l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
        <span>Additional Commands</span>
      </summary>
      <div className="command-menu">
        {snippets.map((category, index) =>
          category.separator ? (
            <hr key={index} />
          ) : (
            <details key={category.categoryName}>
              <summary>{category.categoryName}</summary>
              <div>
                {category.snippets?.map((command, i) =>
                  command.separator ? (
                    <hr key={i} />
                  ) : (
                    <button
                      key={command.name}
                      onClick={(event) => {
                        insert(command.ink!);
                        event.currentTarget
                          .closest(".additional-commands")
                          ?.removeAttribute("open");
                      }}
                    >
                      {command.name}
                    </button>
                  ),
                )}
              </div>
            </details>
          ),
        )}
      </div>
    </details>
  );
}

export function Ribbon({
  tab,
  collapsed,
  onTab,
  onCollapse,
  gameMode,
  onCommand,
  onInsert,
}: {
  tab: RibbonTab;
  collapsed: boolean;
  gameMode: string;
  onTab: (tab: RibbonTab) => void;
  onCollapse: () => void;
  onCommand: (action: string) => void;
  onInsert: (script: string) => void;
}) {
  return (
    <div className="editor-ribbon">
      <div className="ribbon-tabs" role="tablist" aria-label="Ribbon categories">
        {(Object.keys(groups) as RibbonTab[])
          .filter((t) => t !== "Game" || gameMode !== "narrative")
          .map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              aria-controls="ribbon-commands"
              onClick={() => onTab(t)}
            >
              {t}
            </button>
          ))}
        <button
          className="ribbon-collapse"
          aria-label={collapsed ? "Expand ribbon" : "Minimize ribbon"}
          onClick={onCollapse}
        >
          {collapsed ? "⌄" : "⌃"}
        </button>
      </div>
      {!collapsed && (
        <div
          id="ribbon-commands"
          className="ribbon-commands"
          role="tabpanel"
          aria-label={`${tab} commands`}
        >
          {groups[tab].map((group) => (
            <fieldset key={group.label}>
              <legend>{group.label}</legend>
              <div>
                {group.commands.map((command) => (
                  <button
                    key={command.label}
                    title={
                      command.action === "unavailable"
                        ? `${command.label}: the existing engine does not implement this operation`
                        : (commandHelp[command.label] ??
                          `Insert ${command.label.toLowerCase()} into the Ink script.`)
                    }
                    disabled={command.action === "unavailable"}
                    onClick={() =>
                      command.action === "insert"
                        ? onInsert(command.snippet!)
                        : command.action === "upstream"
                          ? onInsert(upstreamSnippet(command.snippet!))
                          : onCommand(command.action)
                    }
                  >
                    <span aria-hidden="true">{command.icon}</span>
                    {command.label}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
          {(tab === "Story" || tab === "Logic") && <AdditionalCommands insert={onInsert} />}
        </div>
      )}
    </div>
  );
}
