export function knotNames(script: string) {
  return outlineEntries(script)
    .filter((entry) => entry.kind === "Knot")
    .map((entry) => entry.name);
}

export function outlineEntries(script: string) {
  let knot = "";
  script = script.replace(/\/\*[\s\S]*?(?:\*\/|$)/g, (comment) => comment.replace(/[^\r\n]/g, " "));
  return script.split("\n").flatMap((line, row) => {
    const match = line.match(/^\s*(={2,}\s*(?!function\b)|=\s*)(\w+)/);
    if (!match) return [];
    const name = match[2]!;
    const main = match[1]!.trim().length > 1;
    if (main) knot = name;
    if (!knot) return [];
    return [
      {
        name,
        path: main ? name : `${knot}.${name}`,
        knot: knot.toLowerCase().replace(/_/g, "-"),
        row,
        kind: main ? "Knot" : "Stitch",
      },
    ];
  });
}
