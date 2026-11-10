import { expect, it } from "vitest";
import { FrameSchema, ReaderFailure } from "../../contracts/story.ts";
import { parseTypography, typographySettings } from "../../contracts/typography.ts";
import { formatTextSelection } from "./text-formatting.ts";
import { compileLanguage, structure } from "./compiler.ts";
import { InkNarrativeEngine } from "../story-runtime/ink-engine.ts";
import { houseProject } from "../../../tests/fixtures/house-project.ts";

it("decodes repeated words and Unicode into ordered spans without changing spoken text", () => {
  expect(
    parseTypography(
      'Écoute <typo style="whisper">👩🏽‍🚀 écoute</typo>, puis <typo direction="vertical">tombe</typo>.',
    ),
  ).toEqual({
    text: "Écoute 👩🏽‍🚀 écoute, puis tombe.",
    typography: [
      { start: 7, end: 21, format: { style: "whisper" } },
      { start: 28, end: 33, format: { direction: "vertical" } },
    ],
  });
  expect(parseTypography('<img src="evil">')).toEqual({ text: '<img src="evil">' });
  expect(() => parseTypography("</typo unexpected>")).toThrow();
});

it.each([
  '<typo style="shout">unfinished',
  '<typo style="shout"',
  '<typo style="unknown">word</typo>',
  '<typo onclick="evil">word</typo>',
  '<typo style="shout"><typo>word</typo></typo>',
  "<typo>two\nparagraphs</typo>",
  "</typo>",
  "<typo></typo>",
  '<typo style="shout" style="wave">word</typo>',
])("rejects malformed or unsupported typography: %s", (source) => {
  expect(() => parseTypography(source)).toThrow();
});

it("replaces and removes an existing style without nesting or changing surrounding prose", () => {
  const line = 'A <typo style="shout">BOOM</typo> nearby.';
  const start = line.indexOf("BOOM");
  const result = formatTextSelection(line, start, start + 4, { style: "whisper", spacing: "wide" });
  expect(result.replacement).toBe('A <typo style="whisper" spacing="wide">BOOM</typo> nearby.');
  expect(
    formatTextSelection(result.replacement, result.selection.start, result.selection.end, {
      style: "default",
    }).replacement,
  ).toBe("A BOOM nearby.");
  expect(() => formatTextSelection(line, 2, 2, {})).toThrow(/Select words/);
  expect(() => formatTextSelection("# segment:id", 0, 12, {})).toThrow(/Ink/);
});

it("splits overlapping styles while retaining unselected words and the exact selection", () => {
  const line = 'A <typo style="shout">red blue</typo> and <typo color="ocean">green</typo>.';
  const start = line.indexOf("blue"),
    end = line.indexOf("green") + 3;
  const result = formatTextSelection(line, start, end, { style: "whisper" });
  expect(parseTypography(result.replacement)).toEqual({
    text: "A red blue and green.",
    typography: [
      { start: 2, end: 6, format: { style: "shout" } },
      { start: 6, end: 18, format: { style: "whisper" } },
      { start: 18, end: 20, format: { color: "ocean" } },
    ],
  });
  const again = formatTextSelection(
    result.replacement,
    result.selection.start,
    result.selection.end,
    { color: "violet" },
  );
  expect(parseTypography(again.replacement).typography?.map((span) => span.format)).toEqual([
    { style: "shout" },
    { color: "violet" },
    { color: "ocean" },
  ]);
  expect(() => formatTextSelection(line, 4, 10, {})).toThrow(/attributes/);
});

it("reads and writes bold, italic, underline and strikethrough; presets declare theirs", () => {
  const line = "Mark these words.";
  const result = formatTextSelection(line, 5, 10, { bold: "on", underline: "on", strike: "on" });
  expect(result.replacement).toBe(
    'Mark <typo bold="on" underline="on" strike="on">these</typo> words.',
  );
  expect(parseTypography(result.replacement).typography).toEqual([
    { start: 5, end: 10, format: { bold: "on", underline: "on", strike: "on" } },
  ]);
  expect(() => parseTypography('<typo bold="yes">x</typo>')).toThrow();
  expect(typographySettings({ style: "shout" })).toMatchObject({ bold: "on" });
  expect(typographySettings({ style: "impact" })).toMatchObject({ bold: "on" });
  expect(typographySettings({ style: "whisper" })).toMatchObject({ italic: "on" });
  expect(typographySettings({ style: "whisper", italic: "off" })).toMatchObject({ italic: "off" });
  // Markup written before these settings existed parses to the same spans.
  expect(parseTypography('A <typo style="shout">BOOM</typo>.').typography).toEqual([
    { start: 2, end: 6, format: { style: "shout" } },
  ]);
});

it("compiles typography through real Ink, restores choices and validates saved offsets", async () => {
  const project = structuredClone(houseProject);
  project.gameMode = "narrative";
  project.languages.en!.configuration = { title: "Type", chapter: "Test" };
  project.languages.en!.script =
    '-> start\n=== start ===\nA <typo style="shout">BOOM</typo>.\n* [<typo color="ocean">Continue</typo>]\n  Next page.\n  -> END';
  const bundle = await compileLanguage(project, "en");
  const engine = new InkNarrativeEngine(bundle);
  const frame = engine.advance();
  expect(frame.segments[0]).toMatchObject({
    text: "A BOOM.",
    typography: [{ start: 2, end: 6, format: { style: "shout" } }],
  });
  expect(frame.choices[0]).toMatchObject({
    text: "Continue",
    typography: [{ start: 0, end: 8, format: { color: "ocean" } }],
  });
  expect(FrameSchema.parse(JSON.parse(JSON.stringify(frame)))).toEqual(frame);
  const restored = new InkNarrativeEngine(bundle);
  restored.restore(engine.serialize(), frame);
  restored.choose(frame.choices[0]!.id);
  expect(restored.advance().segments[0]!.text).toBe("Next page.");
  const invalid = structuredClone(frame);
  invalid.segments[0]!.typography![0]!.end = 999;
  expect(FrameSchema.safeParse(invalid).success).toBe(false);
});

it("aligns each paragraph from its # align tag; left is the default and old frames stay valid", async () => {
  const project = structuredClone(houseProject);
  project.gameMode = "narrative";
  project.languages.en!.configuration = { title: "Align", chapter: "Test" };
  project.languages.en!.script = [
    "-> start",
    "=== start ===",
    "A plain line.",
    "A centred line. # align:center",
    "# align:right",
    "A right line.",
    "A justified line. # align:justify",
    "A left line. # align:left",
    "-> END",
  ].join("\n");
  const frame = new InkNarrativeEngine(await compileLanguage(project, "en")).advance();
  expect(frame.segments.map((segment) => segment.align)).toEqual([
    undefined,
    "center",
    "right",
    "justify",
    undefined,
  ]);
  expect(frame.segments.map((segment) => segment.text)).toContain("A right line.");
  expect(FrameSchema.parse(JSON.parse(JSON.stringify(frame)))).toEqual(frame);
  const old = { passageId: "start", segments: [{ id: "start.p1", text: "Old." }], choices: [] };
  expect(FrameSchema.parse(old)).toEqual(old);
  project.languages.en!.script = "-> start\n=== start ===\nOops. # align:middle\n-> END";
  const invalid = new InkNarrativeEngine(await compileLanguage(project, "en"));
  expect(() => invalid.advance()).toThrow(ReaderFailure);
});

it("lets each translation align its paragraphs without breaking the shared structure", () => {
  const line = (align: string) =>
    `-> start\n=== start ===\nWords. # segment:start.p1${align}\n-> END`;
  expect(structure(line(" # align:center"))).toBe(structure(line("")));
  expect(structure(line(" # align:center"))).not.toBe(structure(line(" # other:tag")));
});
