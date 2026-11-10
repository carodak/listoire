import type { Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { compileProject } from "../../src/features/editor/compiler.ts";
import { defaultReadingPreferences } from "../../src/contracts/presentation.ts";
import { GameDefinitionSchema } from "../../src/contracts/game.ts";

/**
 * A test-only story for what Orée does not use: a photograph detail that triggers a hidden
 * story action, and an ability whose stun is shown and then expires. It is compiled here with
 * the editor's compiler and served in place of Orée to this page only; it never ships.
 */
const script = `VAR clue = false
-> photo
=== photo ===
The photograph lay on the desk. # passage:photo # segment:photo.desk
{clue: The upstairs window in the photograph is open. # segment:photo.clue}
* {not clue} [Notice the upstairs window # choice:notice-window # interaction]
  ~ clue = true
  -> photo
* [Walk to the gate # choice:photo.gate]
  -> gate

=== gate ===
A guardian blocks the gate. # passage:gate # segment:gate.guardian
+ [Fight the guardian # game:fight]
  {game_success: The guardian steps aside.|You fall back.} # segment:gate.after
  -> END
`;

const courier = "sketch.adult-female-medieval-courier-holding-a-folded-letter-001";

export async function withFixtureStory(page: Page) {
  // Orée's published media list, so the fixture's images resolve like the real story's.
  const oree = JSON.parse(await readFile("public/stories/house/en.json", "utf8"));
  const bundles = await compileProject({
    schemaVersion: 1,
    storyId: "house",
    release: "e2e-fixture",
    defaultLocale: "en",
    gameMode: "with-combat",
    variables: [],
    languages: {
      en: {
        script,
        description: "",
        missingTranslation: false,
        defaults: { ...defaultReadingPreferences, sound: false },
        narrationMode: "disabled",
        configuration: {
          title: "Fixture",
          chapter: "Fixture",
          assets: oree.assets,
          scenes: {
            photo: {
              title: "The photograph",
              progress: 0.5,
              blocks: [
                { kind: "text", segmentId: "photo.desk" },
                {
                  kind: "media",
                  id: "photo.picture",
                  image: courier,
                  layout: "inline",
                  photograph: true,
                  examination: {
                    image: courier,
                    title: "The photograph",
                    descriptions: ["The girl beside your grandmother looks exactly like you."],
                    reverse: "If she comes looking for you, do not tell her your name.",
                    actionId: "notice-window",
                    hotspot: { x: 40, y: 20, label: "Inspect the photograph detail" },
                  },
                },
                { kind: "text", segmentId: "photo.clue" },
                { kind: "choices" },
              ],
            },
          },
          character: {
            portrait: oree.character.portrait,
            abilities: [
              { id: "dawn", name: "Dawn", description: "A blinding strike." },
              { id: "observation", name: "Observation", description: "Notice details." },
            ],
            inventory: [
              {
                id: "photo-clue",
                fact: "clue",
                name: "Photograph clue",
                description: "The upstairs window is open.",
              },
            ],
            encounters: [],
          },
          game: GameDefinitionSchema.parse({
            abilities: [
              { id: "dawn", name: "Dawn", attribute: "WIL", offensive: true, effect: "stun" },
              { id: "observation", attribute: "WIL" },
            ],
            encounters: [
              { id: "guardian", name: "The guardian", difficulty: "boss", profile: "resilient" },
            ],
            actions: [{ id: "fight", label: "Fight", kind: "combat", reference: "guardian" }],
            // The stun is added after the guardian answers, so it is visible for one turn.
            rules: { effectsBeforeRetaliation: false },
          }),
        },
      },
    },
  });
  await page.route("**/stories/house/en.json", (route) => route.fulfill({ json: bundles.en }));
}
