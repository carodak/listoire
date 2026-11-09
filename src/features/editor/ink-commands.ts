export interface InkCommandInput {
  name: string;
  label: string;
  condition: string;
  create: boolean;
}
function validate(command: string, input: InkCommandInput, knots: string[]) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?$/.test(input.name))
    throw new Error("Use a valid Ink identifier or knot.stitch path.");
  if ((command === "Knot" || input.create) && knots.includes(input.name))
    throw new Error("That Knot already exists.");
  if (/[\n\r#[\]]/.test(input.label))
    throw new Error("Use a single line without Ink choice delimiters.");
  if (/[\n\r{}]/.test(input.condition))
    throw new Error("Use a single Ink condition without braces.");
}
function choiceCommand(command: string, input: InkCommandInput, id: string) {
  const markers: Record<string, string> = { "Sticky Choice": "+", "Nested Choice": "**" };
  const marker = markers[command] ?? "*";
  return `${marker} ${input.condition ? `{${input.condition}} ` : ""}[${input.label || "Continue"} # choice:${id}]\n  -> ${input.name}\n`;
}
export function buildInkCommand(
  command: string,
  input: InkCommandInput,
  knots: string[],
  id: string,
) {
  validate(command, input, knots);
  const commands: Record<string, string> = {
    Knot: `\n=== ${input.name} ===\nTODO: Translate this passage.\n-> END\n`,
    Stitch: `\n= ${input.name}\nTODO: Translate this passage.\n-> END\n`,
    "Insert Variable": `{${input.name}}`,
    Variable: `~ ${input.name} = ${input.label || "0"}\n`,
    Thread: `<- ${input.name}\n`,
    Tunnel: `-> ${input.name} ->\n`,
  };
  let ink = command.includes("Choice")
    ? choiceCommand(command, input, id)
    : Object.hasOwn(commands, command)
      ? commands[command]
      : `-> ${input.name}\n`;
  if (input.create)
    ink += `\n=== ${input.name} ===\nTODO: Translate this passage.\n${command === "Tunnel" ? "->->" : "-> END"}\n`;
  return ink;
}
