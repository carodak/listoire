export function inkStructure(ink: Record<string, unknown>) {
  // Keep compiled control flow and tags; translated prose never identifies narrative elements.
  function normalize(value: unknown, preserve = false): unknown {
    if (Array.isArray(value)) {
      let tag = false;
      let evaluation = false;
      let choiceText = false;
      return value
        .filter((_, index) => !alignmentTag(value, index))
        .map((token, index, tokens) => {
          if (token === "#") tag = true;
          if (token === "/#") tag = false;
          if (token === "ev") {
            evaluation = true;
            choiceText = isChoiceText(tokens, index);
          }
          if (token === "/ev") evaluation = false;
          const protectedText = preserve || tag || (evaluation && !choiceText);
          if (typeof token === "string" && token.startsWith("^"))
            // Tag values are read trimmed: a space before a following tag means nothing.
            return !protectedText ? "^" : tag ? token.trimEnd() : token;
          return normalize(token, protectedText);
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
/** Alignment is layout: each translation may align its paragraphs on its own. */
function alignmentTag(tokens: unknown[], index: number) {
  const text = (at: number) => typeof tokens[at] === "string" && /^\^\s*align:/.test(tokens[at]);
  return (
    text(index) ||
    (tokens[index] === "#" && text(index + 1)) ||
    (tokens[index] === "/#" && text(index - 1))
  );
}
function isChoiceText(tokens: unknown[], start: number) {
  const end = tokens.indexOf("/ev", start + 1);
  const next = tokens[end + 1];
  return Boolean(next && typeof next === "object" && "*" in next);
}
