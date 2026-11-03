import { afterEach, describe, expect, it, vi } from "vitest";
import { fixtureBundle } from "../../test-fixtures.ts";
import { loadBundle, loadManifest } from "./bundle-loader.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function setup(value: unknown, status = 200) {
  vi.stubGlobal("window", {
    location: { href: "https://example.test/books/", origin: "https://example.test" },
  });
  vi.stubEnv("BASE_URL", "./");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify(value), { status })),
  );
}

describe("published bundle validation", () => {
  it("loads the exact digest/runtime and resolves assets under the application base", async () => {
    setup({ ...fixtureBundle(), storyId: "house" });
    vi.stubEnv("BASE_URL", "./");
    const signal = new AbortController().signal;
    expect((await loadBundle("en", signal)).locale).toBe("en");
    const requested = vi.mocked(fetch).mock.calls[0]![0] as URL;
    expect(requested.pathname).toBe("/books/stories/house/en.json");
  });

  it.each([
    { inkDigest: "0".repeat(64) },
    { locale: "fr" },
    { inkjsVersion: "another-runtime" },
    { mode: "rpg" },
    { schemaVersion: 2 },
  ])("rejects incompatible or malformed content %j", async (change) => {
    setup({ ...fixtureBundle(), ...change });
    await expect(loadBundle("en", new AbortController().signal)).rejects.toThrow("content");
  });

  it("rejects failed requests and oversized content without evaluating it", async () => {
    setup(null, 503);
    await expect(loadBundle("en", new AbortController().signal)).rejects.toThrow("content");
    setup("x".repeat(2_000_001));
    await expect(loadBundle("en", new AbortController().signal)).rejects.toThrow("content");
  });

  it("preserves cancellation rather than publishing a stale content error", async () => {
    const scope = new AbortController();
    scope.abort();
    const aborted = new DOMException("Cancelled", "AbortError");
    vi.stubGlobal("window", {
      location: { href: "https://example.test/", origin: "https://example.test" },
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(aborted));
    await expect(loadBundle("en", scope.signal)).rejects.toBe(aborted);
  });

  it("accepts a declared single-language story and validates its default language", async () => {
    const manifest = {
      schemaVersion: 1,
      storyId: "house",
      defaultLocale: "en",
      locales: ["en"],
    };
    setup(manifest);
    expect(await loadManifest(new AbortController().signal)).toEqual(manifest);
    setup({ ...manifest, defaultLocale: "fr" });
    await expect(loadManifest(new AbortController().signal)).rejects.toThrow("content");
  });

  it.each([
    "https://other.test/books/",
    "//other.test/",
    "file:///books/",
    "javascript:alert(1)",
    "https://user:password@example.test/books/",
  ])("refuses untrusted application bases %s", async (base) => {
    setup({ ...fixtureBundle(), storyId: "house" });
    vi.stubEnv("BASE_URL", base);
    await expect(loadBundle("en", new AbortController().signal)).rejects.toThrow("content");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects locale traversal before fetch, ignores an HTML base and disallows redirects", async () => {
    setup({ ...fixtureBundle(), storyId: "house" });
    vi.stubGlobal("document", { baseURI: "https://other.test/" });
    await expect(loadBundle("../../other" as "en", new AbortController().signal)).rejects.toThrow(
      "content",
    );
    expect(fetch).not.toHaveBeenCalled();
    await loadBundle("en", new AbortController().signal);
    expect(vi.mocked(fetch).mock.calls[0]![0]).toEqual(
      new URL("https://example.test/books/stories/house/en.json"),
    );
    expect(vi.mocked(fetch).mock.calls[0]![1]).toMatchObject({
      redirect: "error",
      credentials: "same-origin",
    });
  });
});
