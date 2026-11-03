import { Compiler } from "inkjs/full";
import { BundleSchema } from "../../contracts/story.ts";
import type { StoryBundle } from "../../contracts/story.ts";
import { StoryProjectSchema } from "../../contracts/editor-project.ts";
import type { StoryProject } from "../../contracts/editor-project.ts";
import packageInfo from "../../../package.json" with { type: "json" };
import { knotNames } from "./ink-commands.ts";

function compileInkJson(script: string) {
  const compiler = new Compiler(script);
  let json: string | void;
  try {
    json = compiler.Compile().ToJson();
  } catch {
    throw new Error(compiler.errors.join("\n") || "Ink compilation failed");
  }
  if (!json) throw new Error(compiler.errors.join("\n") || "Ink compilation failed");
  return JSON.parse(json) as Record<string, unknown>;
}

export function structure(script: string) {
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
  return JSON.stringify(normalize(compileInkJson(script)));
}
function isChoiceText(tokens: unknown[], start: number) {
  const end = tokens.indexOf("/ev", start + 1);
  const next = tokens[end + 1];
  return Boolean(next && typeof next === "object" && "*" in next);
}

export async function compileLanguage(
  project: StoryProject,
  locale: string,
  preview = false,
): Promise<StoryBundle> {
  const language = project.languages[locale];
  if (!language) throw new Error(`Missing language: ${locale}`);
  if (project.gameMode === "with-combat")
    throw new Error("Combat is unavailable: this application has no combat executor.");
  if (language.missingTranslation && !preview)
    throw new Error(`${locale}: translation needs review before publishing.`);
  const imageIds = new Set(
    Object.values(language.configuration.scenes ?? {}).flatMap(
      (scene) =>
        scene.blocks?.filter((block) => block.kind === "media").map((block) => block.id) ?? [],
    ),
  );
  const script = language.script
    .replace(/\r\n?/g, "\n")
    .replace(/^\s*\/\/ @media [a-z0-9.-]+\/([a-z0-9.-]+).*$/gm, (line, id: string) =>
      imageIds.has(id) ? `# media:${id}` : line,
    );
  const ink = compileInkJson(script);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(ink)),
  );
  const inkDigest = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  const passages = declaredPassages(language.script);
  const scenes = language.configuration.scenes ?? {};
  validateScenes(scenes, passages);
  const variables = [...language.script.matchAll(/^\s*VAR\s+([a-z][a-z0-9.-]*)\s*=/gm)].map(
    (m) => m[1]!,
  );
  return BundleSchema.parse({
    ...language.configuration,
    scenes,
    schemaVersion: 1,
    storyId: project.storyId,
    release: project.release,
    locale,
    mode: project.gameMode,
    ink,
    inkDigest,
    inkjsVersion: packageInfo.dependencies.inkjs,
    passages,
    variables,
    authored: true,
    ...(project.gameMode === "narrative" ? { character: undefined } : {}),
    narrationMode: language.narrationMode,
    readingDefaults: language.defaults,
  });
}
function declaredPassages(script: string) {
  const passages: Record<string, string[]> = {};
  let passage = "start";
  for (const line of script.split("\n")) {
    const tag = line.match(/#\s*passage:([a-z][a-z0-9.-]*)/);
    if (tag) passage = tag[1]!;
    const segment = line.match(/#\s*segment:([a-z][a-z0-9.-]*)/);
    if (segment) (passages[passage] ??= []).push(segment[1]!);
  }
  for (const name of knotNames(script))
    passages[name.toLowerCase().replace(/_/g, "-")] ??= ["text"];
  if (!Object.keys(passages).length) passages.start = ["text"];
  return passages;
}
function validateScenes(
  scenes: NonNullable<StoryBundle["scenes"]>,
  passages: Record<string, string[]>,
) {
  for (const [id, scene] of Object.entries(scenes)) {
    if (!passages[id])
      throw new Error(`Scene ${id} no longer has a matching passage. Update its properties.`);
    if (scene.blocks) {
      const previous = scene.blocks.filter((b) => b.kind === "text").map((b) => b.segmentId);
      if (
        JSON.stringify(previous) !==
        JSON.stringify(passages[id]?.filter((segment) => segment !== "text"))
      )
        throw new Error(
          `Scene ${id}: text segment IDs changed. Update the ordered blocks in Scene Properties.`,
        );
    }
  }
}

export async function compileProject(source: StoryProject) {
  const project = StoryProjectSchema.parse(source);
  const reference = structure(project.languages[project.defaultLocale]!.script);
  const bundles: Record<string, StoryBundle> = {};
  for (const [locale, language] of Object.entries(project.languages)) {
    if (structure(language.script) !== reference)
      throw new Error(
        `${locale}: narrative structure differs. Align Ink instructions and stable tags before publishing.`,
      );
    bundles[locale] = await compileLanguage(project, locale);
  }
  return bundles;
}
