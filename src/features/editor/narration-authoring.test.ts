import { afterEach, expect, it, vi } from "vitest";
import { houseProject as original } from "../../../tests/fixtures/house-project.ts";
import { speechOptions } from "../media/speech-options.ts";
import { defaultSpeechSettings } from "../../contracts/speech.ts";
import { cacheNarration } from "./narration-authoring.ts";
import { generateNarrationPreview } from "./narration-sources.ts";

afterEach(() => vi.restoreAllMocks());
it("sends only spoken words when the editor previews a styled segment", async () => {
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response("{}", { status: 503 }));
  await expect(
    generateNarrationPreview(
      "house",
      "en",
      original.languages.en!,
      { id: "intro.p1", text: 'A <typo style="shout">BOOM</typo>.' },
      "nano-default",
      new AbortController().signal,
    ),
  ).rejects.toThrow(/Chatterbox/);
  const post = fetcher.mock.calls.find(([, options]) => options?.method === "POST");
  expect(JSON.parse(post![1]!.body as string).text).toBe("A BOOM.");
});

it("uses generation settings and voice examples in clip matching, while leaving playback speed separate", async () => {
  expect(await speechOptions("nano-default")).toEqual({});
  const first = await speechOptions("nano-default", undefined, defaultSpeechSettings);
  expect(
    (await speechOptions("nano-default", undefined, { ...defaultSpeechSettings, pitch: 2 }))
      .settingsKey,
  ).not.toBe(first.settingsKey);
  expect(await speechOptions("nano-default", undefined, { ...defaultSpeechSettings })).toEqual(
    first,
  );
});

it("rejects missing or oversized generated audio before caching any bytes", async () => {
  const request = {
    clip: original.languages.en!.configuration.narration![0]!,
    audioUrl: "/api/narration/audio/test.mp3",
  };
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response(null, { status: 404 }))
    .mockResolvedValueOnce(new Response(null, { headers: { "content-length": "5000001" } }));
  const signal = new AbortController().signal;
  await expect(cacheNarration(request, "Text", signal)).rejects.toThrow(/cache/);
  await expect(cacheNarration(request, "Text", signal)).rejects.toThrow(/cache/);
  expect(fetcher).toHaveBeenCalledWith(request.audioUrl, {
    signal,
    redirect: "error",
    credentials: "same-origin",
  });
});
