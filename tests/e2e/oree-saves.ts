import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { BundleSchema } from "../../src/contracts/story.ts";
import type { SaveData } from "../../src/contracts/story.ts";
import { createCharacter } from "../../src/features/character/create-character.ts";
import { InkNarrativeEngine } from "../../src/features/story-runtime/ink-engine.ts";
import { StoryDirector } from "../../src/features/story-runtime/director.ts";
import { SaveManager } from "../../src/persistence/save-manager.ts";

/**
 * The reader's own save on the first page that offers "Fight", made in Node by the app's
 * director on the published English bundle (the one the browser loads): first choices, checks
 * rolled and confirmed, notices closed, as a reader would. Milliseconds instead of 35 pages.
 */
async function saveBeforeFirstFight() {
  const bundle = BundleSchema.parse(
    JSON.parse(readFileSync("public/stories/house/en.json", "utf8")),
  );
  const memory = new Map<string, unknown>();
  const saves = new SaveManager({
    read: async (key) => memory.get(key),
    update: async (key, updater) => {
      memory.set(key, updater(memory.get(key)));
    },
  });
  const abilities = bundle.character!.abilities.map((ability) => ability.id);
  const director = new StoryDirector(bundle, new InkNarrativeEngine(bundle), saves, () =>
    createCharacter(abilities, () => 4),
  );
  await director.load();
  for (let step = 0; step < 60; step++) {
    const { frame, game, occurrenceId } = director.getSnapshot();
    if (frame!.choices.some((choice) => /^Fight/.test(choice.text)))
      return {
        key: `save:${bundle.checkpointId ?? bundle.storyId}:en`,
        save: (await saves.read(bundle))!,
      };
    if (game?.pendingCheck) await director.finishCheck(occurrenceId!);
    else if (game?.pendingEvent) await director.finishEvent(occurrenceId!);
    else await director.choose(frame!.choices[0]!.id, occurrenceId!);
    if (director.getSnapshot().failure) throw new Error(`Story walk failed at step ${step}`);
  }
  throw new Error("No Fight choice within 60 steps");
}

/** Puts the reader's save on the first page that offers "Fight"; open the story afterwards. */
export async function startBeforeFirstFight(page: Page) {
  const { key, save } = await saveBeforeFirstFight();
  await page.goto("/");
  await page.evaluate(
    ([key, save]) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("listoire");
        request.onupgradeneeded = () => request.result.createObjectStore("records");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction("records", "readwrite");
          transaction.objectStore("records").put(save, key as string);
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    [key, save] as [string, SaveData],
  );
}
