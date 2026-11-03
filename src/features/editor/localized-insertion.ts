import type { StoryProject } from "../../contracts/editor-project.ts";
import type { AceRange, AcePosition } from "./ace.ts";

function offset(rows: string[], position: AcePosition) {
  return (
    rows.slice(0, position.row).reduce((count, line) => count + line.length + 1, 0) +
    position.column
  );
}
function correspondingPosition(source: string[], target: string[], position: AcePosition) {
  const sourceLine = source[position.row] ?? "";
  const anchor = source
    .slice(0, position.row + 1)
    .map((line, row) => ({ line, row }))
    .filter((v) => /^\s*={2,}/.test(v.line))
    .at(-1);
  const found = anchor ? target.findIndex((line) => line.trim() === anchor.line.trim()) : 0;
  if (found < 0)
    throw new Error(
      "A matching Knot is missing in another translation. Align its structure before inserting shared commands.",
    );
  let row = anchor ? found + position.row - anchor.row : position.row;
  const stable = sourceLine.match(/#\s*(?:segment|choice):([a-z0-9.-]+)/)?.[0];
  if (stable) {
    row = target.findIndex((line) => line.includes(stable));
    if (row < 0)
      throw new Error("A matching stable narrative ID is missing in another translation.");
  }
  const targetLine = target[row] ?? "";
  if (position.column === 0) return { row, column: 0 };
  if (position.column === sourceLine.length) return { row, column: targetLine.length };
  if (sourceLine === targetLine) return { row, column: position.column };
  throw new Error(
    "Insert shared commands at a line boundary. Translated text has no safe corresponding cursor inside a sentence.",
  );
}
export function insertLocalized(
  project: StoryProject,
  locale: string,
  text: string,
  range: AceRange,
  shared: boolean,
) {
  const source = project.languages[locale]!.script.split("\n");
  const languages = { ...project.languages };
  for (const [id, language] of Object.entries(languages)) {
    if (id !== locale && !shared) continue;
    const rows = language.script.split("\n");
    const start = id === locale ? range.start : correspondingPosition(source, rows, range.start);
    const end = id === locale ? range.end : correspondingPosition(source, rows, range.end);
    const script =
      language.script.slice(0, offset(rows, start)) +
      text +
      language.script.slice(offset(rows, end));
    languages[id] = {
      ...language,
      script,
      missingTranslation: language.missingTranslation || id !== locale,
    };
  }
  return { ...project, languages };
}
