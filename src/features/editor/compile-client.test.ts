import { afterEach, expect, it, vi } from "vitest";
import type { StoryProject } from "../../contracts/editor-project.ts";

vi.mock("./asset-validation.ts", () => ({ verifyMediaAssets: vi.fn(async () => {}) }));

/** A stand-in compiler worker: answers each request with its locale, or never for "stuck". */
class FakeWorker {
  static started = 0;
  terminated = false;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    FakeWorker.started++;
  }
  postMessage({ id, locale }: { id: number; locale?: string }) {
    if (locale === "stuck") return;
    setTimeout(() =>
      this.onmessage?.({
        data: locale === "broken" ? { id, error: "Ink error" } : { id, bundles: { [locale!]: {} } },
      }),
    );
  }
  terminate() {
    this.terminated = true;
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.resetModules();
  FakeWorker.started = 0;
});

async function client() {
  vi.stubGlobal("Worker", FakeWorker);
  return (await import("./compile-client.ts")).compileInWorker;
}
const project = {} as StoryProject;

it("compiles everything in one worker and gives each caller its own answer", async () => {
  const compile = await client();
  const [en, broken, fr] = await Promise.allSettled([
    compile(project, "en"),
    compile(project, "broken"),
    compile(project, "fr"),
  ]);
  expect(en).toEqual({ status: "fulfilled", value: { en: {} } });
  expect(broken).toMatchObject({ status: "rejected", reason: new Error("Ink error") });
  expect(fr).toEqual({ status: "fulfilled", value: { fr: {} } });
  expect(FakeWorker.started).toBe(1);
});

it("replaces a worker stuck for 15 s, failing what waited on it", async () => {
  vi.useFakeTimers();
  const compile = await client();
  const stuck = compile(project, "stuck");
  const failed = expect(stuck).rejects.toThrow("Compilation exceeded 15 seconds");
  await vi.advanceTimersByTimeAsync(15_000);
  await failed;
  const next = compile(project, "en");
  await vi.advanceTimersByTimeAsync(1);
  await expect(next).resolves.toEqual({ en: {} });
  expect(FakeWorker.started).toBe(2);
});
