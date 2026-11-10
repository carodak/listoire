import { expect, it } from "vitest";
import { compileProject } from "../editor/compiler.ts";
import { StoryProjectSchema } from "../../contracts/editor-project.ts";
import { defaultReadingPreferences } from "../../contracts/presentation.ts";
import { InkNarrativeEngine } from "./ink-engine.ts";
import { StoryDirector } from "./director.ts";
import { SaveManager } from "../../persistence/save-manager.ts";
import type { StoryBundle } from "../../contracts/story.ts";

const first = `-> rest
=== rest ===
The fight is over. # passage:rest # segment:rest.p1
+ [Let her tend your injuries # choice:rest.go] -> ward
=== ward ===
She wraps your hand. # passage:ward # segment:ward.p1
-> END
`;
// The update adds an event page between the choice and the next page.
const second = first
  .replace("# choice:rest.go] -> ward", "# choice:rest.go] -> care")
  .replace(
    "=== ward ===",
    "=== care ===\nA soothing warmth spreads. # passage:care # segment:care.p1\n+ [Continue # choice:care.go] -> ward\n=== ward ===",
  );

async function bundle(script: string, compatibleInkDigests?: string[]) {
  const project = StoryProjectSchema.parse({
    schemaVersion: 1,
    storyId: "house",
    release: "update-test",
    defaultLocale: "en",
    gameMode: "narrative",
    variables: [],
    languages: {
      en: {
        script,
        description: "",
        missingTranslation: false,
        configuration: { title: "Update", chapter: "Test", compatibleInkDigests },
        defaults: defaultReadingPreferences,
        narrationMode: "disabled",
      },
    },
  });
  return (await compileProject(project)).en!;
}

async function savedOn(old: StoryBundle) {
  const memory = new Map<string, unknown>();
  const saves = new SaveManager({
    read: async (key) => memory.get(key),
    update: async (key, update) => {
      memory.set(key, update(memory.get(key)));
    },
  });
  const director = new StoryDirector(old, new InkNarrativeEngine(old), saves);
  await director.load();
  return saves;
}

it("a story update loads saves of the versions it declares compatible, at the same place", async () => {
  const old = await bundle(first);
  const saves = await savedOn(old);
  const updated = await bundle(second, [old.inkDigest]);
  const director = new StoryDirector(updated, new InkNarrativeEngine(updated), saves);
  await director.load();
  expect(director.getSnapshot().failure).toBeNull();
  expect(director.getSnapshot().frame!.passageId).toBe("rest");
  await director.choose("rest.go", director.getSnapshot().occurrenceId!);
  expect(director.getSnapshot().frame!.passageId).toBe("care"); // the new event page
  expect((await saves.read(updated))!.inkDigest).toBe(updated.inkDigest);
});

it("any other version is still refused as another story version", async () => {
  const saves = await savedOn(await bundle(first));
  const updated = await bundle(second);
  const director = new StoryDirector(updated, new InkNarrativeEngine(updated), saves);
  await director.load();
  expect(director.getSnapshot().failure).toBe("save-incompatible");
});
