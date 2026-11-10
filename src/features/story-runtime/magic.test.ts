import { readFileSync, readdirSync } from "node:fs";
import { expect, it } from "vitest";
import { BundleSchema } from "../../contracts/story.ts";
import { GameStateSchema } from "../../contracts/game.ts";
import { storyAssetIds } from "../../contracts/story-assets.ts";
import { createCharacter } from "../character/create-character.ts";
import { performAction } from "../rules/actions.ts";
import { combatTurn } from "../rules/combat.ts";
import { InkNarrativeEngine } from "./ink-engine.ts";
import { gameFacts } from "./game-session.ts";
import { narrationSegments } from "../../../tools/narration-segments.ts";

const bundles = ["en", "fr"].map((locale) =>
  BundleSchema.parse(
    JSON.parse(
      readFileSync(
        new URL(`../../../public/stories/house/${locale}.json`, import.meta.url),
        "utf8",
      ),
    ),
  ),
);

it.each(bundles)(
  "plays all 42 $locale pages with saved dice, both encounters and recoverable outcomes",
  (bundle) => {
    const character = createCharacter(
      bundle.character!.abilities.map((ability) => ability.id),
      () => 3,
    );
    const game = GameStateSchema.parse({
      rng: 4812,
      xp: 0,
      baseMaxHp: 6,
      inventory: [],
      equipment: {},
    });
    const engine = new InkNarrativeEngine(bundle);
    const pages: string[] = [];
    const encounters: string[] = [];
    let frame = engine.advance();
    for (let step = 0; step < 50; step++) {
      pages.push(frame.passageId);
      const saved = engine.serialize();
      engine.restore(saved, frame);
      if (!frame.choices.length) break;
      const choice = frame.choices[0]!;
      const action = bundle.game!.actions.find((action) => action.id === choice.gameAction);
      if (action) {
        performAction(character, game, bundle.game!, action, choice.id);
        if (game.combat) encounters.push(game.combat.encounterId);
        for (let turn = 0; game.combat && turn < 30; turn++) {
          combatTurn(character, game, bundle.game!, { kind: "attack" });
          expect(game.lastResult?.dice?.[0]).toEqual({ sides: 6, value: game.lastResult!.roll });
          expect(GameStateSchema.parse(structuredClone(game))).toEqual(game);
        }
        expect(game.combat).toBeUndefined();
        engine.setGameFacts(gameFacts({ character, game }));
      }
      engine.choose(choice.id);
      frame = engine.advance();
    }
    expect(pages).toHaveLength(42); // Pass 7: + "soins", the care of Ysée
    expect(pages.slice(0, 4)).toEqual(["matin-ville", "etabli", "livraison", "atelier"]);
    expect(pages.at(-1)).toBe("fin");
    expect(pages[pages.indexOf("apres") + 1]).toBe("soins");
    expect(encounters).toEqual(["ysee-training", "broken-guardian"]);
    expect(character.health.current).toBeGreaterThan(0);
    expect(character.abilities).toHaveLength(6);
  },
);
it.each(bundles)("makes Ysée the training opponent in both $locale outcomes", (bundle) => {
  const encounter = bundle.game!.encounters.find((entry) => entry.id === "ysee-training")!;
  expect(encounter.name).toBe("Ysée Valambre");
  const training = new InkNarrativeEngine(bundle, "entrainement").advance();
  const duel = new InkNarrativeEngine(bundle, "duel").advance();
  expect(duel.choices[0]!.gameAction).toBe("training-duel");
  expect(bundle.game!.actions.find((action) => action.id === "training-duel")!.reference).toBe(
    encounter.id,
  );
  for (const game_success of [true, false]) {
    const outcome = new InkNarrativeEngine(bundle, "apres_duel", { game_success }).advance();
    for (const frame of [training, duel, outcome]) {
      const text = frame.segments.map((segment) => segment.text).join(" ");
      expect(text).toContain("Ysée");
      expect(text).not.toMatch(/dragon|confetti/iu);
    }
    expect(outcome.choices[0]!.gameAction).toBe("recover");
  }
});
it.each(bundles)("uses gallery portraits and two-second story board cues in $locale", (bundle) => {
  for (const encounter of bundle.game!.encounters) {
    expect(encounter.portrait).toMatch(/^sketch\./);
    expect(bundle.assets!.find((asset) => asset.id === encounter.portrait)?.type).toBe("image");
  }
  const events = Object.values(bundle.scenes!).flatMap((scene) => scene.events ?? []);
  const cues = events.filter(
    (event) => event.id.endsWith(".board-beat") || event.id === "serre.camera-impact",
  );
  expect(cues.length).toBeGreaterThanOrEqual(5);
  for (const cue of cues) {
    expect(cue.blockId).toBe("page");
    expect(cue.action.kind === "effect" && cue.action.effect.duration).toBe(2000);
  }
});

it.each(bundles)(
  "exports both $locale check outcomes for normal narration and only publishes referenced assets",
  (bundle) => {
    const segments = narrationSegments(bundle);
    expect(segments.filter((segment) => segment.segmentId === "air-result.p1")).toHaveLength(2);
    expect(segments.filter((segment) => segment.segmentId === "archives.p1")).toHaveLength(2);
    expect(segments.filter((segment) => segment.segmentId === "retour.p2")).toHaveLength(3);
    expect(new Set(bundle.assets!.map((asset) => asset.id))).toEqual(storyAssetIds(bundle));
    const blocks = Object.values(bundle.scenes!)
      .flatMap((scene) => scene.blocks ?? [])
      .filter((block) => block.kind === "media");
    expect(blocks.filter((block) => block.layout === "right")).toHaveLength(2);
    expect(blocks.every((block) => ["inline", "right", "fullscreen"].includes(block.layout))).toBe(
      true,
    );
    expect(bundle.voiceProfiles).toHaveLength(6);
    expect(
      bundle.voiceProfiles!.every((profile) =>
        profile.reference?.data.startsWith("data:audio/mpeg;base64,"),
      ),
    ).toBe(true);
    expect(bundle.narratorVoiceSelection).toEqual(
      bundle.voiceProfiles!.map((profile) => profile.id),
    );
    const files = new Set(
      readdirSync(new URL("../../../public/stories/house/media/", import.meta.url)),
    );
    for (const asset of bundle.assets!) expect(files.has(asset.path.slice(6))).toBe(true);
  },
);
