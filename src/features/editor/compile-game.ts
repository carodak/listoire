import type { StoryProject } from "../../contracts/editor-project.ts";

export function gamePrelude(project: StoryProject, locale: string, script: string) {
  const game = project.languages[locale]!.configuration.game;
  for (const match of script.matchAll(/#\s*game:([a-z][a-z0-9.-]*)/g)) {
    const action = game?.actions.find((action) => action.id === match[1]);
    if (project.gameMode === "narrative" || !action)
      throw new Error(`Unknown game action: ${match[1]}. Configure it in Game before previewing.`);
    if (action.kind === "combat" && project.gameMode !== "with-combat")
      throw new Error("Enable Game Mode With Combat before using an encounter.");
  }
  const variables =
    project.gameMode === "narrative" || !game
      ? []
      : ["game_success", "game_roll", "game_hp", "game_xp", "game_outcome"];
  const declarations = variables.filter(
    (name) => !new RegExp(`^\\s*VAR\\s+${name}\\s*=`, "m").test(script),
  );
  const prefix = declarations
    .map((name) => `VAR ${name} = ${name === "game_success" ? "false" : "0"}`)
    .join("\n");
  return { script: prefix + "\n" + script, variables };
}
