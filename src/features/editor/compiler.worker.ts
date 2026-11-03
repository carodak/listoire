import { compileProject, compileLanguage } from "./compiler.ts";
import type { StoryProject } from "../../contracts/editor-project.ts";

self.onmessage = async (
  event: MessageEvent<{ id: number; project: StoryProject; locale?: string }>,
) => {
  const { id, project, locale } = event.data;
  try {
    const bundles = locale
      ? { [locale]: await compileLanguage(project, locale, true) }
      : await compileProject(project);
    self.postMessage({ id, bundles });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
