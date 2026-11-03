import { readFileSync } from "node:fs";
import { BundleSchema } from "./contracts/story.ts";
import type { Locale } from "./contracts/story.ts";

export function fixtureBundle(locale: Locale = "en") {
  return BundleSchema.parse(
    JSON.parse(
      readFileSync(new URL(`../.fallow/fixtures/${locale}.json`, import.meta.url), "utf8"),
    ),
  );
}
