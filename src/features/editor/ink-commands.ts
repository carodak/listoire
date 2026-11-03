export interface InkCommandInput {
  name: string;
  label: string;
  condition: string;
  create: boolean;
}
export function knotNames(script: string) {
  return [...script.matchAll(/^\s*={2,}\s*(?!function\b)([\w]+)\b/gm)].map((m) => m[1]!);
}
export function outlineEntries(script: string) {
  let knot = "";
  return script.split("\n").flatMap((line, row) => {
    const main = line.match(/^\s*={2,}\s*(?!function\b)(\w+)/);
    if (main) {
      knot = main[1]!;
      return [
        { name: knot, path: knot, knot: knot.toLowerCase().replace(/_/g, "-"), row, kind: "Knot" },
      ];
    }
    const stitch = line.match(/^\s*=\s*(\w+)/);
    return stitch && knot
      ? [
          {
            name: stitch[1]!,
            path: `${knot}.${stitch[1]}`,
            knot: knot.toLowerCase().replace(/_/g, "-"),
            row,
            kind: "Stitch",
          },
        ]
      : [];
  });
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
  const marker = command === "Sticky Choice" ? "+" : command === "Nested Choice" ? "**" : "*";
  return `${marker} ${input.condition ? `{${input.condition}} ` : ""}[${input.label || "Continue"} # choice:${id}]\n  -> ${input.name}\n`;
}
export function buildInkCommand(
  command: string,
  input: InkCommandInput,
  knots: string[],
  id: string,
) {
  validate(command, input, knots);
  let ink: string;
  if (command.includes("Choice")) ink = choiceCommand(command, input, id);
  else
    switch (command) {
      case "Knot":
        ink = `\n=== ${input.name} ===\nTODO: Translate this passage.\n-> END\n`;
        break;
      case "Stitch":
        ink = `\n= ${input.name}\nTODO: Translate this passage.\n-> END\n`;
        break;
      case "Insert Variable":
        ink = `{${input.name}}`;
        break;
      case "Variable":
        ink = `~ ${input.name} = ${input.label || "0"}\n`;
        break;
      case "Thread":
        ink = `<- ${input.name}\n`;
        break;
      case "Tunnel":
        ink = `-> ${input.name} ->\n`;
        break;
      default:
        ink = `-> ${input.name}\n`;
    }
  if (input.create)
    ink += `\n=== ${input.name} ===\nTODO: Translate this passage.\n${command === "Tunnel" ? "->->" : "-> END"}\n`;
  return ink;
}
