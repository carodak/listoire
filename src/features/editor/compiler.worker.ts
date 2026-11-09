import { compileProject, compileLanguage } from "./compiler.ts";
import type { StoryProject } from "../../contracts/editor-project.ts";

self.onmessage = async (event: MessageEvent<{ project: StoryProject; locale?: string }>) => {
  const { project, locale } = event.data;
  try {
    const bundles = locale
      ? { [locale]: await compileLanguage(project, locale, true) }
      : await compileProject(project);
    self.postMessage({ bundles });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
};
