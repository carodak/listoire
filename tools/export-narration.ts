import { readFile, mkdir, writeFile } from "node:fs/promises";
import { BundleSchema } from "../src/contracts/story.ts";
import { narrationSegments } from "./narration-segments.ts";

const output = new URL("../assets/narration/", import.meta.url);
await mkdir(output, { recursive: true });
const segments = new Map<
  string,
  { segmentId: string; passageId: string; locale: string; text: string; spokenTextDigest: string }
>();
const inkDigests: Record<string, string> = {};
for (const locale of ["en", "fr"]) {
  const bundle = BundleSchema.parse(
    JSON.parse(
      await readFile(new URL(`../public/stories/house/${locale}.json`, import.meta.url), "utf8"),
    ),
  );
  inkDigests[locale] = bundle.inkDigest;
  for (const segment of narrationSegments(bundle))
    segments.set(`${locale}:${segment.segmentId}:${segment.spokenTextDigest}`, segment);
}
await writeFile(
  new URL("segments.json", output),
  `${JSON.stringify({ storyId: "house", inkDigests, segments: [...segments.values()] }, null, 2)}\n`,
);
console.log(
  `Exported ${segments.size} exact localized segment variants from all authored Ink paths`,
);
