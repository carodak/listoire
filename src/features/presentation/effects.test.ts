import { afterEach, expect, it, vi } from "vitest";
import { runEffect, EffectsEngine } from "./effects.ts";
import { CinematicSchema } from "../../contracts/cinematic.ts";
afterEach(() => vi.unstubAllGlobals());
it("pauses, resumes and cancels every depth layer and restores their original transforms", async () => {
  const animations: {
    pause: ReturnType<typeof vi.fn>;
    play: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
    finished: Promise<void>;
  }[] = [];
  const element = () =>
    ({
      style: { scale: "", translate: "", opacity: "", transform: "" },
      animate: vi.fn(() => {
        let reject!: (reason: Error) => void;
        const animation = {
          pause: vi.fn(),
          play: vi.fn(),
          cancel: vi.fn(() => reject(new Error("aborted"))),
          finished: new Promise<void>((_, fail) => {
            reject = fail;
          }),
        };
        animations.push(animation);
        return animation;
      }),
    }) as unknown as HTMLElement;
  const image = element(),
    layer = element();
  const engine = new EffectsEngine(),
    scope = new AbortController();
  const playback = engine.play(
    {
      id: "cinematic-camera",
      duration: 14000,
      cinematic: CinematicSchema.parse({ preset: "parallax" }),
    },
    { canvas: image, image, layers: [layer] },
    scope.signal,
    false,
  );
  expect(animations).toHaveLength(2);
  expect(image.animate).toHaveBeenCalledWith(
    expect.any(Array),
    expect.objectContaining({ easing: "cubic-bezier(.25,.1,.25,1)" }),
  );
  engine.pause();
  expect(animations.every((animation) => animation.pause.mock.calls.length === 1)).toBe(true);
  engine.resume();
  expect(animations.every((animation) => animation.play.mock.calls.length === 1)).toBe(true);
  scope.abort();
  expect(await playback).toBe("aborted");
  expect(animations.every((animation) => animation.cancel.mock.calls.length === 1)).toBe(true);
  engine.stop();
  expect(layer.style.transform).toBe("");
});
it("uses shared zoom/pan effects, cancels handles and tolerates reduced motion", async () => {
  let reject!: (reason: Error) => void;
  const animation = {
    cancel: vi.fn(() => reject(new Error("Abort"))),
    finished: new Promise<void>((_resolve, rejectFn) => {
      reject = rejectFn;
    }),
  };
  const target = {
    style: { scale: "", translate: "" },
    animate: vi.fn(() => animation),
  } as unknown as HTMLElement;
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
it("shakes clearly but briefly, whatever the authored duration", async () => {
  const { cameraKeyframes } = await import("./effect-keyframes.ts");
  const frames = cameraKeyframes(
    { id: "screen-shake", duration: 2000, intensity: 0.12, target: "canvas" },
    {} as HTMLElement,
  );
  const peak = Math.max(
    ...frames.map((frame) =>
      Math.abs(Number(/translate\((-?[\d.]+)px/.exec(String(frame.transform))![1])),
    ),
  );
  expect(peak).toBeGreaterThanOrEqual(8); // was 1.7px at this intensity
  expect(frames.at(-2)!.offset).toBeCloseTo(0.3); // still by 600 ms of 2 s
  expect(frames.at(-1)).toMatchObject({ offset: 1, transform: frames[0]!.transform });
});
