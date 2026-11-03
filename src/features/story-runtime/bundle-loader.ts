import {
  BundleSchema,
  LocaleSchema,
  ReaderFailure,
  StoryManifestSchema,
} from "../../contracts/story.ts";
import type { Locale, StoryBundle, StoryManifest } from "../../contracts/story.ts";
import packageInfo from "../../../package.json";

async function fetchStoryFile(file: "manifest" | Locale, signal: AbortSignal): Promise<unknown> {
  const base = new URL(import.meta.env.BASE_URL, window.location.href);
  const url = new URL(`stories/house/${file}.json`, base);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.origin !== window.location.origin ||
    url.username ||
    url.password ||
    !url.pathname.startsWith(base.pathname)
  ) {
    throw new ReaderFailure("content");
  }
  const response = await fetch(url, { signal, redirect: "error", credentials: "same-origin" });
  if (!response.ok) throw new ReaderFailure("content");
  const source = await response.text();
  if (source.length > 2_000_000) throw new ReaderFailure("content");
  return JSON.parse(source);
}

export async function loadManifest(signal: AbortSignal): Promise<StoryManifest> {
  try {
    const manifest = StoryManifestSchema.parse(await fetchStoryFile("manifest", signal));
    if (manifest.storyId !== "house") throw new ReaderFailure("content");
    return manifest;
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ReaderFailure("content");
  }
}

export async function loadBundle(locale: Locale, signal: AbortSignal): Promise<StoryBundle> {
  try {
    const language = LocaleSchema.parse(locale);
    const bundle = BundleSchema.parse(await fetchStoryFile(language, signal));
    const bytes = new TextEncoder().encode(JSON.stringify(bundle.ink));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hex = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    if (
      bundle.locale !== language ||
      bundle.storyId !== "house" ||
      bundle.inkDigest !== hex ||
      bundle.inkjsVersion !== packageInfo.dependencies.inkjs
    ) {
      throw new Error("Story identity or runtime mismatch");
    }
    return bundle;
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ReaderFailure("content");
  }
}
