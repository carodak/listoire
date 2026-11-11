import { afterEach, expect, it, vi } from "vitest";
import { appPath, storyFileUrl } from "./app-path.ts";

afterEach(() => vi.unstubAllEnvs());

it("builds application and story file paths under the deployed base path (REVIEW #6)", () => {
  expect(storyFileUrl("house", "media/night.webp")).toBe("/stories/house/media/night.webp");
  expect(appPath("editor")).toBe("/editor");
  vi.stubEnv("BASE_URL", "/books/");
  expect(storyFileUrl("house", "media/night.webp")).toBe("/books/stories/house/media/night.webp");
  expect(appPath("editor/vendor/ace.js")).toBe("/books/editor/vendor/ace.js");
  expect(appPath()).toBe("/books/");
});
