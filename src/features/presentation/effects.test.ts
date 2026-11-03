import { afterEach, expect, it, vi } from "vitest";
import { runEffect } from "./effects.ts";
afterEach(() => vi.unstubAllGlobals());
it("uses shared zoom/pan effects, cancels handles and tolerates reduced motion", async () => {
  let reject!: (reason: Error) => void;
  const animation = {
    cancel: vi.fn(() => reject(new Error("Abort"))),
    finished: new Promise<void>((_resolve, rejectFn) => {
      reject = rejectFn;
    }),
  };
  const target = { animate: vi.fn(() => animation) } as unknown as HTMLElement;
  vi.stubGlobal("getComputedStyle", () => ({ scale: "none", translate: "none" }));
  const scope = new AbortController();
  runEffect(target, { id: "camera-zoom", scale: 2, duration: 350 }, scope.signal, false);
  expect(target.animate).toHaveBeenCalledTimes(1);
  scope.abort();
  await Promise.resolve();
  expect(animation.cancel).toHaveBeenCalledTimes(1);
  runEffect(
    target,
    { id: "camera-pan", x: 10, y: 0, duration: 350 },
    new AbortController().signal,
    true,
  );
  expect(target.animate).toHaveBeenCalledTimes(1);
});
