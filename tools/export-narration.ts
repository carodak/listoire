import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { BundleSchema } from "../src/contracts/story.ts";
import { InkNarrativeEngine } from "../src/features/story-runtime/ink-engine.ts";

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
  const engine = new InkNarrativeEngine(bundle);
  const initial = engine.advance();
  const queue = [{ state: engine.serialize(), frame: initial }];
  const visited = new Set<string>();
  while (queue.length) {
    if (visited.size > 1024) throw new Error("Narration export exceeded the authored path budget");
    const { state, frame } = queue.shift()!;
    if (visited.has(state)) continue;
    visited.add(state);
    for (const segment of frame.segments) {
      const text = segment.text.normalize("NFC");
      const digest = createHash("sha256").update(text).digest("hex");
      segments.set(`${locale}:${segment.id}:${digest}`, {
        segmentId: segment.id,
        passageId: frame.passageId,
        locale,
        text,
        spokenTextDigest: digest,
      });
    }
    for (const choice of [...frame.choices, ...(frame.actions ?? [])]) {
      engine.restore(state, frame);
      engine.choose(choice.id);
      const next = engine.advance();
      queue.push({ state: engine.serialize(), frame: next });
    }
  }
}
await writeFile(
  new URL("segments.json", output),
  `${JSON.stringify({ storyId: "house", inkDigests, segments: [...segments.values()] }, null, 2)}\n`,
);
console.log(
  `Exported ${segments.size} exact localized segment variants from all authored Ink paths`,
);
