import { writeFile } from "node:fs/promises";
import type { StoryBundle } from "../src/contracts/story.ts";

export async function writeBundle(output: URL, bundle: StoryBundle) {
  await writeFile(new URL(`${bundle.locale}.json`, output), JSON.stringify(bundle) + "\n");
  console.log(`Built ${bundle.storyId}/${bundle.locale}: ${bundle.inkDigest.slice(0, 12)}`);
}
