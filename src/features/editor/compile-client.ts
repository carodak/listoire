import { verifyMediaAssets } from "./asset-validation.ts";
import type { StoryProject } from "../../contracts/editor-project.ts";
import type { StoryBundle } from "../../contracts/story.ts";

type Result = { id: number; error?: string; bundles?: Record<string, StoryBundle> };
interface Pending {
  resolve: (bundles: Record<string, StoryBundle>) => void;
  reject: (error: Error) => void;
}

// One compiler worker for the page: starting one loads the whole Ink compiler again.
let worker: Worker | undefined;
let nextId = 0;
const pending = new Map<number, Pending>();

/** Stops the worker (a stuck or broken compile) and fails every compile waiting on it. */
function restart(error: Error) {
  worker?.terminate();
  worker = undefined;
  for (const request of pending.values()) request.reject(error);
  pending.clear();
}
function compiler() {
  if (worker) return worker;
  worker = new Worker(new URL("./compiler.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = ({ data }: MessageEvent<Result>) => {
    const request = pending.get(data.id);
    pending.delete(data.id);
    if (data.error) request?.reject(new Error(data.error));
    else request?.resolve(data.bundles!);
  };
  worker.onerror = () => restart(new Error("Ink compiler could not start."));
  return worker;
}

export async function compileInWorker(
  project: StoryProject,
  locale?: string,
): Promise<Record<string, StoryBundle>> {
  const id = nextId++;
  const bundles = await new Promise<Record<string, StoryBundle>>((resolve, reject) => {
    const timeout = setTimeout(
      () => restart(new Error("Compilation exceeded 15 seconds. Check for oversized Ink input.")),
      15_000,
    );
    pending.set(id, {
      resolve: (bundles) => {
        clearTimeout(timeout);
        resolve(bundles);
      },
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    });
    compiler().postMessage({ id, project, locale });
  });
  await verifyMediaAssets(bundles);
  return bundles;
}
