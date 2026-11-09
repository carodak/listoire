import { expect, it } from "vitest";
import { ProjectHistory } from "./project-history.ts";
import type { StoryProject } from "../../contracts/editor-project.ts";
import { refreshedHouseProject } from "../../../tests/fixtures/house-project.ts";

it("groups typing, restores complete isolated projects and drops redo after a new edit", () => {
  const history = new ProjectHistory();
  const original = structuredClone(refreshedHouseProject);
  const first = structuredClone(original);
  first.languages.fr!.script += "\n// first";
  const second = structuredClone(first);
  second.languages.en!.configuration.title = "Second";
  history.record(original, first, "Typing", 0);
  history.record(first, second, "Typing", 100);
  second.languages.en!.configuration.title = "Later mutation";
  expect(history.undo()).toEqual(original);
  expect(history.canUndo).toBe(false);
  expect(history.redo()!.languages.en!.configuration.title).toBe("Second");
  history.undo();
  history.record(original, first, "Typing", 200);
  expect(history.canRedo).toBe(false);
  expect(history.undo()).toEqual(original);
});

it("keeps at most thirty undo steps and separates edits after a pause", () => {
  let restored: StoryProject | undefined;
  const history = new ProjectHistory();
  const project = structuredClone(refreshedHouseProject);
  for (let index = 0; index < 31; index++) {
    const next = { ...project, release: String(index + 1) };
    history.record(project, next, "Edit", index * 1000);
    Object.assign(project, next);
  }
  for (let index = 0; index < 30; index++) restored = history.undo();
  expect(restored!.release).toBe("1");
  expect(history.canUndo).toBe(false);
  expect(history.undo()).toBeUndefined();
  for (let index = 0; index < 30; index++) restored = history.redo();
  expect(restored!.release).toBe("31");
  expect(history.canRedo).toBe(false);
  expect(history.redo()).toBeUndefined();
});
