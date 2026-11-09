import { verifyMediaAssets } from "./asset-validation.ts";
import type { StoryProject } from "../../contracts/editor-project.ts";
import type { StoryBundle } from "../../contracts/story.ts";

export async function compileInWorker(
  project: StoryProject,
  locale?: string,
): Promise<Record<string, StoryBundle>> {
  const bundles = await new Promise<Record<string, StoryBundle>>((resolve, reject) => {
    const worker = new Worker(new URL("./compiler.worker.ts", import.meta.url), { type: "module" });
    const timeout = setTimeout(
      () => finish(new Error("Compilation exceeded 15 seconds. Check for oversized Ink input.")),
      15_000,
    );
    function finish(error?: Error, bundles?: Record<string, StoryBundle>) {
      clearTimeout(timeout);
      worker.terminate();
      if (error) reject(error);
      else resolve(bundles!);
    }
    worker.onmessage = (
      event: MessageEvent<{ error?: string; bundles?: Record<string, StoryBundle> }>,
    ) => {
      finish(event.data.error ? new Error(event.data.error) : undefined, event.data.bundles);
    };
    worker.onerror = () => finish(new Error("Ink compiler could not start."));
    worker.postMessage({ project, locale });
  });
  await verifyMediaAssets(bundles);
  return bundles;
}
