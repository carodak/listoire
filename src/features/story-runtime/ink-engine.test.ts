import { describe, expect, it } from "vitest";
import { Compiler } from "inkjs/full";
import { Story } from "inkjs";
import { InkNarrativeEngine } from "./ink-engine.ts";
import { fixtureBundle } from "../../test-fixtures.ts";

describe("real InkJS integration", () => {
  it.each(["en", "fr"] as const)(
    "branches, interpolates and restores %s without Continue replay",
    (locale) => {
      const bundle = fixtureBundle(locale);
      const engine = new InkNarrativeEngine(bundle);
      const first = engine.advance();
      const state = engine.serialize();
      expect(first.choices.map((choice) => choice.id)).toEqual(["call", "listen"]);
      const endings = [];
      for (const choice of first.choices) {
        engine.restore(state, first);
        engine.choose(choice.id);
        const last = engine.advance();
        expect(last.passageId).toBe("landing");
        expect(last.choices).toEqual([]);
        const restored = new InkNarrativeEngine(bundle);
        restored.restore(engine.serialize(), last);
        expect(restored.serialize()).toBe(engine.serialize());
        endings.push(last.segments[0]!.text);
      }
      expect(new Set(endings).size).toBe(2);
      expect(first.segments.map((segment) => segment.id)).toEqual([
        "threshold.key",
        "threshold.window",
      ]);
    },
  );

  it("validates companion segment references and refuses untagged choices", () => {
    const bundle = fixtureBundle();
    expect(() => new InkNarrativeEngine({ ...bundle, passages: {} }).advance()).toThrow("content");
    const ink = JSON.parse(
      new Compiler("Hello. # passage:threshold # segment:threshold.key\n* [Missing ID]\n  -> END")
        .Compile()
        .ToJson() as string,
    );
    expect(() => new InkNarrativeEngine({ ...bundle, ink }).advance()).toThrow("content");
  });

  it("rejects a frame that disagrees with saved choices and a corrupt Ink state", () => {
    const engine = new InkNarrativeEngine(fixtureBundle());
    const frame = engine.advance();
    expect(() => engine.restore(engine.serialize(), { ...frame, choices: [] })).toThrow(
      "save-invalid",
    );
    expect(() => engine.restore("{}", frame)).toThrow("save-invalid");
  });

  it("saves an internal request boundary and supplies a result before continuing", () => {
    const source =
      "VAR passed = false\n* [Resolve # request:door.check]\n  {passed: Success.|Failure.}\n  -> END";
    const compiled = new Compiler(source).Compile().ToJson() as string;
    const story = new Story(compiled);
    while (story.canContinue) story.Continue();
    expect(story.currentChoices[0]!.tags).toEqual(["request:door.check"]);
    const restored = new Story(compiled);
    restored.state.LoadJson(story.state.ToJson());
    expect(restored.currentChoices[0]!.tags).toEqual(["request:door.check"]);
    restored.variablesState["passed"] = true;
    restored.ChooseChoiceIndex(0);
    expect(restored.ContinueMaximally()).toContain("Success.");
  });

  it("keeps translated IDs and branch structure aligned", () => {
    const structure = (locale: "en" | "fr") => {
      const engine = new InkNarrativeEngine(fixtureBundle(locale));
      const first = engine.advance();
      engine.choose("listen");
      const last = engine.advance();
      return [first, last].map((frame) => ({
        passage: frame.passageId,
        segments: frame.segments.map((segment) => segment.id),
        choices: frame.choices.map((choice) => choice.id),
      }));
    };
    expect(structure("fr")).toEqual(structure("en"));
  });
});
