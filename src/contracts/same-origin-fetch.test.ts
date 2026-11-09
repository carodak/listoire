import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sameOriginFetch } from "./same-origin-fetch.ts";

const mp3 = "data:audio/mpeg;base64,SUQzBAAAAAAA";
let fetch: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubGlobal("window", { location: new URL("https://listoire.test/app/page") });
  fetch = vi.fn(async () => new Response("ok"));
  vi.stubGlobal("fetch", fetch);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sameOriginFetch", () => {
  it.each([
    "/stories/house/en.json",
    "media/door.webp",
    "https://listoire.test/api/narration",
    new URL("https://listoire.test/stories/house/manifest.json"),
    mp3,
  ])("fetches %s unchanged with redirects refused", async (url) => {
    await sameOriginFetch(url, { method: "HEAD" });
    expect(fetch).toHaveBeenCalledWith(url, {
      method: "HEAD",
      signal: undefined,
      redirect: "error",
      credentials: "same-origin",
    });
  });

  it.each([
    ["another origin", "https://evil.test/x.mp3"],
    ["another port", "https://listoire.test:8443/x.mp3"],
    ["plain http for an https page", "http://listoire.test/x.mp3"],
    ["a protocol-relative URL", "//evil.test/x.mp3"],
    ["credentials in the URL", "https://user:secret@listoire.test/x.mp3"],
    ["a username only", "https://user@listoire.test/x.mp3"],
    ["a non-audio data URL", "data:text/html;base64,PHNjcmlwdD4="],
    ["a WAV data URL", "data:audio/wav;base64,UklGRg=="],
    ["a data URL with trailing script", `${mp3}<script>`],
    ["a javascript: URL", "javascript:alert(1)"],
    ["a blob: URL", "blob:https://listoire.test/1234"],
  ])("rejects %s before any request", async (_, url) => {
    await expect(sameOriginFetch(url)).rejects.toThrow("Blocked request outside this site");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("answers an oversized declared body with a failed response", async () => {
    fetch.mockResolvedValue(new Response("x", { headers: { "content-length": "11" } }));
    expect((await sameOriginFetch("/a.mp3", { maxBytes: 11 })).ok).toBe(true);
    expect((await sameOriginFetch("/a.mp3", { maxBytes: 10 })).ok).toBe(false);
  });

  it("aborts on either the caller's signal or its timeout", async () => {
    const caller = new AbortController();
    await sameOriginFetch("/a.json", { signal: caller.signal, timeoutMs: 60_000 });
    const combined = fetch.mock.calls[0]![1].signal as AbortSignal;
    expect(combined).not.toBe(caller.signal);
    caller.abort();
    expect(combined.aborted).toBe(true);
  });

  it("resolves relative URLs against a stand-in origin outside the browser", async () => {
    vi.stubGlobal("window", undefined);
    await sameOriginFetch("/stories/house/en.json");
    await expect(sameOriginFetch("https://evil.test/")).rejects.toThrow("Blocked");
  });
});
