export function inkStructure(ink: Record<string, unknown>) {
  // Keep compiled control flow and tags; translated prose never identifies narrative elements.
  function normalize(value: unknown, preserve = false): unknown {
    if (Array.isArray(value)) {
      let tag = false;
      let evaluation = false;
      let choiceText = false;
      return value.map((token, index) => {
        if (token === "#") tag = true;
        if (token === "/#") tag = false;
        if (token === "ev") {
          evaluation = true;
          choiceText = isChoiceText(value, index);
        }
        if (token === "/ev") evaluation = false;
        const protectedText = preserve || tag || (evaluation && !choiceText);
        return typeof token === "string" && token.startsWith("^") && !protectedText
          ? "^"
          : normalize(token, protectedText);
      });
    }
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, normalize(entry, preserve)]),
      );
    return value;
  }
  return JSON.stringify(normalize(ink));
}
function isChoiceText(tokens: unknown[], start: number) {
  const end = tokens.indexOf("/ev", start + 1);
  const next = tokens[end + 1];
  return Boolean(next && typeof next === "object" && "*" in next);
}
